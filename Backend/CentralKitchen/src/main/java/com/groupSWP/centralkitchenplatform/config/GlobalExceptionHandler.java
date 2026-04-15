package com.groupSWP.centralkitchenplatform.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Lớp cấu hình bắt và xử lý ngoại lệ toàn cục (Global Exception Handler) cho toàn bộ hệ thống.
 * <p>
 * Lớp này sử dụng {@link RestControllerAdvice} để can thiệp vào quá trình trả về phản hồi
 * của mọi Controller. Khi có lỗi xảy ra (Validation, Business Logic, Security...), nó sẽ
 * đánh chặn lỗi đó và định dạng lại thành một cấu trúc JSON thống nhất, thân thiện với Frontend.
 * </p>
 * <p>
 * <b>Tầm quan trọng của Xử lý lỗi Tập trung:</b> Trong hệ thống Central Kitchen với hàng chục
 * thực thể và hàng trăm quy tắc nghiệp vụ, việc để lỗi phát sinh tự do có thể dẫn đến tình trạng
 * rò rỉ thông tin hạ tầng hoặc làm Frontend bị "crash" do nhận dữ liệu không mong muốn.
 * Lớp Handler này đóng vai trò như một bộ lọc an ninh cuối cùng, đảm bảo rằng mọi phản hồi lỗi
 * đều tuân thủ một chuẩn giao tiếp duy nhất. Điều này không chỉ giúp đội ngũ Frontend dễ dàng
 * ánh xạ thông báo lỗi lên giao diện người dùng mà còn giúp đội ngũ phát triển nhanh chóng
 * khoanh vùng sự cố thông qua các thông tin lỗi rõ ràng, tường minh.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Bắt và xử lý các lỗi liên quan đến xác thực dữ liệu đầu vào (Validation).
     * <p>
     * Thường xảy ra khi client gửi request body không thỏa mãn các điều kiện ràng buộc
     * (như {@code @Valid}, {@code @NotNull}, {@code @NotBlank}, {@code @Positive}...)
     * trong các class DTO.
     * </p>
     * <p>
     * <b>Luồng xử lý:</b> Phương thức này duyệt qua danh sách tất cả các trường vi phạm
     * và gom nhóm chúng lại thành một bản đồ (Map). Việc trả về chi tiết tên trường kèm
     * thông báo lỗi giúp người dùng cuối biết chính xác vị trí nhập liệu sai trên biểu mẫu (form),
     * từ đó nâng cao đáng kể trải nghiệm người dùng (UX) và giảm thiểu các yêu cầu hỗ trợ kỹ thuật.
     * </p>
     *
     * @param ex Ngoại lệ {@link MethodArgumentNotValidException} chứa danh sách các trường bị lỗi.
     * @return Phản hồi HTTP 400 (Bad Request) với body là một Map chứa cặp [Tên trường : Thông báo lỗi].
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();

        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        return new ResponseEntity<>(errors, HttpStatus.BAD_REQUEST);
    }

    /**
     * Bắt và xử lý các lỗi vi phạm logic nghiệp vụ (Business Rules).
     * <p>
     * Thường xảy ra khi các lớp Service chủ động ném ra {@link IllegalArgumentException}
     * để chặn các thao tác không hợp lệ (ví dụ: "Số lượng không đủ", "Mã đơn hàng không tồn tại").
     * </p>
     * <p>
     * <b>Nguyên tắc Fail-fast:</b> Hệ thống ứng dụng triệt để nguyên tắc "Thất bại sớm" để
     * bảo vệ tính toàn vẹn của dữ liệu kho bãi và tài chính. Khi một quy tắc kinh doanh bị vi phạm,
     * ngoại lệ này được kích hoạt ngay lập tức để ngăn chặn các tác vụ ghi dữ liệu sai lệch
     * vào cơ sở dữ liệu, đồng thời phản hồi lý do cụ thể về phía người quản lý.
     * </p>
     *
     * @param ex Ngoại lệ {@link IllegalArgumentException} chứa thông báo lỗi chi tiết.
     * @return Phản hồi HTTP 400 (Bad Request) với cấu trúc JSON: {@code {"message": "Lý do lỗi"}}.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBusinessExceptions(IllegalArgumentException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("message", ex.getMessage());

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    /**
     * Bắt và xử lý các lỗi runtime chung phát sinh trong quá trình chạy ứng dụng.
     * <p>
     * Đóng vai trò như một màng lọc dự phòng để bắt các ngoại lệ {@link RuntimeException}
     * mà các lập trình viên chủ động ném ra trong code (throw new RuntimeException("...")).
     * </p>
     * <p>
     * <b>Lớp bảo vệ cuối cùng:</b> Đây là "lưới an toàn" để đánh chặn mọi tình huống bất ngờ
     * không thuộc các nhóm lỗi đặc thù bên trên. Nó đảm bảo hệ thống luôn trả về mã lỗi
     * thuộc đầu 4xx thay vì lỗi 500 mơ hồ, giúp bảo mật hạ tầng bằng cách che giấu các
     * thông tin nhạy cảm của hệ thống máy chủ đằng sau một thông báo lỗi chuẩn hóa.
     * </p>
     *
     * @param ex Ngoại lệ {@link RuntimeException} chứa thông báo lỗi.
     * @return Phản hồi HTTP 400 (Bad Request) with cấu trúc JSON: {@code {"error": "Bad Request", "message": "..."}}.
     */
    @ExceptionHandler(RuntimeException.class)
    public org.springframework.http.ResponseEntity<java.util.Map<String, String>> handleRuntimeException(RuntimeException ex) {
        java.util.Map<String, String> errorResponse = new java.util.HashMap<>();
        errorResponse.put("error", "Bad Request");
        errorResponse.put("message", ex.getMessage());
        return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Bắt và xử lý các lỗi liên quan đến phân quyền (Authorization) của Spring Security.
     * <p>
     * Xảy ra khi một người dùng đã đăng nhập (có Token hợp lệ) nhưng lại cố gắng truy cập
     * vào một API vượt quá thẩm quyền của họ (bị chặn bởi {@code @PreAuthorize}).
     * </p>
     * <p>
     * <b>Kiểm soát Quyền truy cập:</b> Ngoại lệ này xác nhận rằng lớp bảo vệ RBAC (Role-Based Access Control)
     * đang hoạt động hiệu quả. Nó ngăn chặn tuyệt đối các hành vi leo thang đặc quyền, đảm bảo rằng
     * dữ liệu nhạy cảm của các bộ phận khác nhau (như kế toán và vận chuyển) luôn được cô lập an toàn.
     * </p>
     *
     * @param ex Ngoại lệ {@link AccessDeniedException} do Spring Security ném ra.
     * @return Phản hồi HTTP 403 (Forbidden) với cấu trúc JSON cảnh báo từ chối truy cập.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDeniedException(AccessDeniedException ex) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "Forbidden");
        errorResponse.put("message", "Bạn không có quyền truy cập chức năng này (Access Denied)!");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }
}