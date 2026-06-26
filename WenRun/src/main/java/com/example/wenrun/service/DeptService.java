package com.example.wenrun.service;

import com.example.wenrun.entity.Dept;

import java.util.List;

public interface DeptService {
    List<Dept> list(Integer status);
    Dept getById(Long id);
    Long create(Dept dept);
    void update(Dept dept);
}
