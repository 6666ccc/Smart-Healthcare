package com.example.huiliao.mapper;

import com.example.huiliao.entity.SysRole;
import com.example.huiliao.entity.SysUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysUserMapper {

    SysUser selectByUsername(@Param("username") String username);

    SysUser selectByPhone(@Param("phone") String phone);

    SysUser selectById(@Param("id") Long id);

    List<SysRole> selectRolesByUserId(@Param("userId") Long userId);

    int insert(SysUser user);

    int insertUserRole(@Param("userId") Long userId, @Param("roleId") Long roleId);

    SysRole selectRoleByCode(@Param("roleCode") String roleCode);

    int updateById(SysUser user);
}
