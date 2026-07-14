package com.example.wenrun.controller;

import com.example.wenrun.common.Result;
import com.example.wenrun.entity.MedicalItem;
import com.example.wenrun.service.MedicalItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medical-items")
@RequiredArgsConstructor
public class MedicalItemController {

    private final MedicalItemService medicalItemService;

    @GetMapping
    public Result<List<MedicalItem>> list(@RequestParam(required = false) Integer itemType,
                                          @RequestParam(required = false) Integer status) {
        return Result.success(medicalItemService.list(itemType, status));
    }

    @GetMapping("/{id}")
    public Result<MedicalItem> get(@PathVariable Long id) {
        return Result.success(medicalItemService.getById(id));
    }

    @PostMapping
    public Result<Long> create(@RequestBody MedicalItem item) {
        return Result.success(medicalItemService.create(item));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody MedicalItem item) {
        item.setId(id);
        medicalItemService.update(item);
        return Result.success();
    }
}
