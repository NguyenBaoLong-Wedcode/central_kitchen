package com.groupSWP.centralkitchenplatform.service.order;

import com.groupSWP.centralkitchenplatform.dto.cart.AddToCartRequest;
import com.groupSWP.centralkitchenplatform.dto.cart.CartResponse;
import com.groupSWP.centralkitchenplatform.dto.cart.CheckoutRequest;
import com.groupSWP.centralkitchenplatform.dto.order.OrderResponse;
import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import com.groupSWP.centralkitchenplatform.entities.auth.Store;
import com.groupSWP.centralkitchenplatform.entities.cart.Cart;
import com.groupSWP.centralkitchenplatform.entities.cart.CartItem;
import com.groupSWP.centralkitchenplatform.entities.cart.CartItemKey;
import com.groupSWP.centralkitchenplatform.entities.logistic.Order;
import com.groupSWP.centralkitchenplatform.entities.product.Product;
import com.groupSWP.centralkitchenplatform.repositories.auth.AccountRepository;
import com.groupSWP.centralkitchenplatform.repositories.order.CartItemRepository;
import com.groupSWP.centralkitchenplatform.repositories.order.CartRepository;
import com.groupSWP.centralkitchenplatform.repositories.product.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Service quản lý luồng Giỏ hàng (Cart Management) của Cửa hàng trưởng.
 * <p>
 * Đóng vai trò như một trạm trung chuyển (Drafting Station), cho phép thêm, bớt,
 * sửa số lượng các mặt hàng trước khi quyết định chốt thành một Đơn đặt hàng (Order) chính thức.
 * </p>
 * <p>
 * <b>Kiến trúc Service (Service Architecture):</b> Lớp CartService hoạt động như một bộ não
 * trung tâm xử lý toàn bộ logic nghiệp vụ (business logic) trước khi đơn hàng được chốt.
 * Việc tách biệt luồng Giỏ hàng (Cart) ra khỏi luồng Đơn hàng (Order) giúp hệ thống Central Kitchen
 * tối ưu hóa hiệu suất cơ sở dữ liệu. Nó cho phép các Cửa hàng trưởng (Store Manager) thực hiện
 * hàng chục thao tác thêm/bớt/sửa/xóa liên tục trong ngày mà không gây "rác" cho bảng Order chính.
 * </p>
 * <p>
 * Đồng thời, service này ứng dụng triệt để cơ chế `@Transactional` của Spring Data JPA.
 * Điều này cực kỳ quan trọng trong giai đoạn Checkout: nếu quá trình đẩy dữ liệu từ Cart sang Order
 * gặp bất kỳ sự cố nào (ví dụ: mất kết nối DB, lỗi logic tính toán bên OrderService), toàn bộ
 * thao tác sẽ được Rollback lại trạng thái ban đầu một cách an toàn, đảm bảo không bao giờ
 * xảy ra tình trạng "giỏ hàng bị xóa sạch nhưng đơn hàng lại chưa được tạo ra".
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final AccountRepository accountRepository;

    // 🛡️ Bơm OrderService vào để "ký gửi" việc tạo đơn
    private final OrderService orderService;

    /**
     * Hàm Helper: Tìm Cửa hàng (Store) dựa trên Username đăng nhập.
     * <p>Đảm bảo người dùng phải được liên kết với một Cửa hàng mới có quyền sử dụng giỏ hàng.</p>
     *
     * @param username Tên đăng nhập của người dùng.
     * @return Thực thể {@link Store} tương ứng.
     * @throws RuntimeException Nếu tài khoản không tồn tại hoặc chưa được cấp quyền quản lý Cửa hàng.
     */
    private Store getStoreByUsername(String username) {
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại trong hệ thống!"));

        Store store = account.getStore();
        if (store == null) {
            throw new RuntimeException("Tài khoản này chưa được cấp quyền quản lý Cửa hàng nào!");
        }
        return store;
    }

    /**
     * Khởi tạo hoặc Lấy Giỏ hàng hiện hành của Cửa hàng.
     * <p>Mỗi cửa hàng chỉ có duy nhất 1 giỏ hàng nháp (Draft Cart) hoạt động tại một thời điểm.</p>
     *
     * @param store Thực thể Cửa hàng.
     * @return Thực thể {@link Cart} của cửa hàng đó.
     */
    private Cart getOrCreateCart(Store store) {
        return cartRepository.findByStore_StoreId(store.getStoreId()).orElseGet(() -> {
            Cart newCart = Cart.builder()
                    .cartId("CART-" + store.getStoreId())
                    .store(store)
                    .lastUpdated(LocalDateTime.now())
                    .build();
            return cartRepository.save(newCart);
        });
    }

    /**
     * Thêm sản phẩm vào giỏ hàng.
     * <p>
     * Nếu sản phẩm chưa có trong giỏ, hệ thống sẽ tạo dòng mới.
     * Nếu đã có, hệ thống sẽ cộng dồn số lượng.
     * </p>
     *
     * @param username Tên đăng nhập của người dùng.
     * @param request  Payload chứa thông tin sản phẩm và số lượng cần thêm.
     */
    @Transactional
    public void addToCart(String username, AddToCartRequest request) {
        Store store = getStoreByUsername(username);
        Cart cart = getOrCreateCart(store);

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại!"));

        CartItemKey key = new CartItemKey(cart.getCartId(), product.getProductId());

        CartItem cartItem = cartItemRepository.findById(key).orElse(
                CartItem.builder()
                        .id(key)
                        .cart(cart)
                        .product(product)
                        .quantity(0)
                        .build()
        );

        cartItem.setQuantity(cartItem.getQuantity() + request.getQuantity());
        cartItemRepository.save(cartItem);

        cart.setLastUpdated(LocalDateTime.now());
        cartRepository.save(cart);
    }

    /**
     * Lấy chi tiết toàn bộ Giỏ hàng (View Cart).
     * <p>
     * Truy xuất danh sách sản phẩm đang nằm trong giỏ, tính toán thành tiền từng món (SubTotal)
     * và tổng hóa đơn dự kiến (Total Amount) để hiển thị lên màn hình trước khi chốt đơn.
     * </p>
     *
     * @param username Tên đăng nhập của người dùng.
     * @return Đối tượng {@link CartResponse} chứa cấu trúc giỏ hàng hiện tại.
     */
    public CartResponse getCart(String username) {
        Store store = getStoreByUsername(username);
        Cart cart = getOrCreateCart(store);
        List<CartItem> cartItems = cartItemRepository.findByCart_CartId(cart.getCartId());

        List<CartResponse.CartItemDto> itemDtos = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (CartItem item : cartItems) {
            Product product = item.getProduct();
            BigDecimal subTotal = product.getSellingPrice().multiply(new BigDecimal(item.getQuantity()));
            totalAmount = totalAmount.add(subTotal);

            itemDtos.add(CartResponse.CartItemDto.builder()
                    .productId(product.getProductId())
                    .productName(product.getProductName())
                    .quantity(item.getQuantity())
                    .unitPrice(product.getSellingPrice())
                    .subTotal(subTotal)
                    .build());
        }

        return CartResponse.builder()
                .cartId(cart.getCartId())
                .storeId(store.getStoreId())
                .items(itemDtos)
                .totalAmount(totalAmount)
                .build();
    }

    /**
     * Chốt đơn (Checkout) từ Giỏ hàng nháp thành Đơn hàng chính thức.
     * <p>
     * Cơ chế: Lấy toàn bộ dữ liệu trong giỏ, chuyển sang OrderService để khởi tạo đơn hàng.
     * Sau khi đặt hàng thành công, hệ thống sẽ tự động dọn sạch giỏ nháp.
     * </p>
     *
     * @param username Tên đăng nhập của người dùng.
     * @param request  Payload chứa thông tin ghi chú và loại đơn (Khẩn cấp/Tiêu chuẩn).
     * @return Đối tượng {@link OrderResponse} chứa thông tin Đơn hàng vừa được tạo.
     * @throws RuntimeException Nếu giỏ hàng đang trống.
     */
    @Transactional(rollbackFor = Exception.class) // 🛡️ BẢO VỆ CHÉO: Lỗi bất kỳ chỗ nào cũng ROLLBACK toàn bộ luồng
    public OrderResponse checkoutCart(String username, CheckoutRequest request) {
        Store store = getStoreByUsername(username);

        // 4.1. Lấy giỏ hàng ra
        Cart cart = cartRepository.findByStore_StoreId(store.getStoreId())
                .orElseThrow(() -> new RuntimeException("Giỏ hàng đang trống, không có gì để chốt!"));

        List<CartItem> cartItems = cartItemRepository.findByCart_CartId(cart.getCartId());
        if (cartItems.isEmpty()) {
            throw new RuntimeException("Chưa có món nào trong giỏ hàng cả!");
        }

        // 4.2. GỌI TRỰC TIẾP HÀM MỚI TẠO BÊN ORDER SERVICE (Không cần map DTO nữa)
        boolean isUrgent = (request.getOrderType() == Order.OrderType.URGENT);
        OrderResponse response = orderService.createOrderFromCart(store, cartItems, request.getNote(), isUrgent);

        // 4.3. DỌN SẠCH GIỎ HÀNG SAU KHI CHỐT THÀNH CÔNG
        cartItemRepository.deleteByCart_CartId(cart.getCartId());
        log.info("Cửa hàng {} đã chốt Giỏ hàng thành Đơn thật thành công! Mã đơn: {}", store.getStoreId(), response.getOrderId());

        return response;
    }

    /**
     * Cập nhật số lượng của một sản phẩm trong giỏ hàng.
     * <p>
     * Nếu người dùng nhập số lượng <= 0, hệ thống sẽ tự động xóa sản phẩm đó khỏi giỏ.
     * </p>
     *
     * @param username    Tên đăng nhập của người dùng.
     * @param productId   Mã sản phẩm cần thay đổi số lượng.
     * @param newQuantity Số lượng đích muốn cập nhật.
     */
    @Transactional
    public void updateCartItem(String username, String productId, Integer newQuantity) {
        Store store = getStoreByUsername(username);
        Cart cart = getOrCreateCart(store);

        CartItemKey key = new CartItemKey(cart.getCartId(), productId);
        CartItem cartItem = cartItemRepository.findById(key)
                .orElseThrow(() -> new RuntimeException("Sản phẩm này không có trong giỏ hàng!"));

        if (newQuantity <= 0) {
            cartItemRepository.delete(cartItem);
        } else {
            cartItem.setQuantity(newQuantity);
            cartItemRepository.save(cartItem);
        }

        cart.setLastUpdated(LocalDateTime.now());
        cartRepository.save(cart);
    }

    /**
     * Xóa bỏ hoàn toàn một sản phẩm khỏi giỏ hàng.
     *
     * @param username  Tên đăng nhập của người dùng.
     * @param productId Mã sản phẩm cần loại bỏ.
     */
    @Transactional
    public void removeCartItem(String username, String productId) {
        Store store = getStoreByUsername(username);
        Cart cart = getOrCreateCart(store);

        CartItemKey key = new CartItemKey(cart.getCartId(), productId);
        CartItem cartItem = cartItemRepository.findById(key)
                .orElseThrow(() -> new RuntimeException("Sản phẩm này không có trong giỏ hàng!"));

        cartItemRepository.delete(cartItem);

        cart.setLastUpdated(LocalDateTime.now());
        cartRepository.save(cart);
    }
}