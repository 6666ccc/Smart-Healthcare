package com.example.huiliao.controller;

import com.example.huiliao.common.Result;
import com.example.huiliao.dto.PatientQueryDTO;
import com.example.huiliao.entity.Patient;
import com.example.huiliao.service.PatientService;
import com.example.huiliao.vo.PatientVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 患者接口
 */
@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @GetMapping
    public Result<List<PatientVO>> list(PatientQueryDTO query) {
        return Result.success(patientService.list(query));
    }

    @GetMapping("/{id}")
    public Result<PatientVO> getById(@PathVariable Long id) {
        return Result.success(patientService.getById(id));
    }

    @PostMapping
    public Result<Long> create(@RequestBody Patient patient) {
        return Result.success(patientService.create(patient));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Patient patient) {
        patient.setId(id);
        patientService.update(patient);
        return Result.success();
    }
}
