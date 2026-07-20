package com.example.wenrun.controller;

import com.example.wenrun.common.Result;
import com.example.wenrun.entity.Drug;
import com.example.wenrun.service.DrugService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/drugs")
@RequiredArgsConstructor
public class DrugController {

  private final DrugService drugService;

  @GetMapping
  public Result<List<Drug>> list(@RequestParam(required = false) String keyword,
      @RequestParam(required = false) Integer status) {
    return Result.success(drugService.list(keyword, status));
  }

  @GetMapping("/{id}")
  public Result<Drug> get(@PathVariable Long id) {
    return Result.success(drugService.getById(id));
  }

  @PostMapping
  public Result<Long> create(@RequestBody Drug drug) {
    return Result.success(drugService.create(drug));
  }

  @PutMapping("/{id}")
  public Result<Void> update(@PathVariable Long id, @RequestBody Drug drug) {
    drug.setId(id);
    drugService.update(drug);
    return Result.success();
  }
}
