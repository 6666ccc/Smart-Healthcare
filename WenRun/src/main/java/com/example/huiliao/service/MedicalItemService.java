package com.example.huiliao.service;

import com.example.huiliao.entity.MedicalItem;

import java.util.List;

public interface MedicalItemService {
    List<MedicalItem> list(Integer itemType, Integer status);
    MedicalItem getById(Long id);
    Long create(MedicalItem item);
    void update(MedicalItem item);
}
