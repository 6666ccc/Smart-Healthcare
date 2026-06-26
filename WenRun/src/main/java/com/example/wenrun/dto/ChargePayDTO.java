package com.example.wenrun.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ChargePayDTO {
    @NotNull
    private Integer payType;
    private BigDecimal paidAmount;
}
