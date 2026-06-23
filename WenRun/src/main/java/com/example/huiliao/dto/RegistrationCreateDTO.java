package com.example.huiliao.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RegistrationCreateDTO {
    @NotNull
    private Long patientId;
    @NotNull
    private Long scheduleId;
}
