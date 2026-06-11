package com.example.huiliao.mapper;

import com.example.huiliao.entity.SysRole;
import com.example.huiliao.entity.SysUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysUserMapper {

    SysUser selectByUsername(@Param("username") String username);

    SysUser selectById(@Param("id") Long id);

    List<SysRole> selectRolesByUserId(@Param("userId") Long userId);
}
