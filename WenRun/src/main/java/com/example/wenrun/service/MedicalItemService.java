package com.example.wenrun.service;

import com.example.wenrun.entity.MedicalItem;

import java.util.List;

public interface MedicalItemService {
    List<MedicalItem> list(Integer itemType, Integer status);
    MedicalItem getById(Long id);
    Long create(MedicalItem item);
    void update(MedicalItem item);
}
