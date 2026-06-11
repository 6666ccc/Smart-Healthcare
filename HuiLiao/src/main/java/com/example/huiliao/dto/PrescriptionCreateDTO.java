package com.example.huiliao.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class PrescriptionCreateDTO {
    @NotNull
    private Long visitId;
    @NotEmpty
    private List<PrescriptionItemDTO> items;
}
