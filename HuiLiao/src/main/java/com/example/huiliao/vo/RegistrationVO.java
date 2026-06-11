package com.example.huiliao.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class RegistrationVO {
    private Long id;
    private String regNo;
    private Long patientId;
    private String patientName;
    private Long deptId;
    private String deptName;
    private Long staffId;
    private String staffName;
    private LocalDateTime regTime;
    private BigDecimal regFee;
    private Integer status;
}
