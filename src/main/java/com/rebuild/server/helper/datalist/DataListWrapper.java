/*
rebuild - Building your business-systems freely.
Copyright (C) 2018 devezhao <zhaofang123@gmail.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

package com.rebuild.server.helper.datalist;

import cn.devezhao.persist4j.Entity;
import cn.devezhao.persist4j.Field;
import cn.devezhao.persist4j.engine.ID;
import cn.devezhao.persist4j.query.compiler.SelectItem;
import com.alibaba.fastjson.JSON;
import com.rebuild.server.Application;
import com.rebuild.server.configuration.portals.FieldValueWrapper;
import com.rebuild.server.metadata.MetadataHelper;
import com.rebuild.server.metadata.entity.DisplayType;
import com.rebuild.server.metadata.entity.EasyMeta;
import com.rebuild.utils.JSONUtils;
import org.apache.commons.lang.StringUtils;

import java.util.Map;

/**
 * 数据包装
 * 
 * @author Zhao Fangfang
 * @since 1.0, 2013-6-20
 */
public class DataListWrapper {
	
	/**
	 * 无权限标识
	 */
	public static final String NO_READ_PRIVILEGES = "$NOPRIVILEGES$";

	private int total;
	private Object[][] data;
	
	private SelectItem[] selectFields;
	private Entity entity;
	
	// for 权限验证
	private ID user;
	private Map<String, Integer> queryJoinFields;
	
	/**
	 * @param total
	 * @param data
	 * @param selectFields
	 * @param entity
	 */
	public DataListWrapper(int total, Object[][] data, SelectItem[] selectFields, Entity entity) {
		this.total = total;
		this.data = data;
		this.selectFields = selectFields;
		this.entity = entity;
	}
	
	/**
	 * @param user
	 * @param joinFields
	 */
	protected void setPrivilegesFilter(ID user, Map<String, Integer> joinFields) {
		if (user != null && joinFields != null && !joinFields.isEmpty()) {
			this.user = user;
			this.queryJoinFields = joinFields;
		}
	}
	
	/**
	 * @return
	 */
	public JSON toJson() {
		final Field nameFiled = MetadataHelper.getNameField(entity);
		final int joinFieldsLen = queryJoinFields == null ? 0 : queryJoinFields.size();
		final int selectFieldsLen = selectFields.length - joinFieldsLen;
		
		for (int rowIndex = 0; rowIndex < data.length; rowIndex++) {
			final Object[] original = data[rowIndex];

			Object[] row = original;
			if (joinFieldsLen > 0) {
				row = new Object[selectFieldsLen];
				System.arraycopy(original, 0, row, 0, selectFieldsLen);
				data[rowIndex] = row;
			}

			Object nameValue = StringUtils.EMPTY;
			for (int colIndex = 0; colIndex < selectFieldsLen; colIndex++) {
				if (!checkHasJoinFieldPrivileges(selectFields[colIndex], original)) {
					row[colIndex] = NO_READ_PRIVILEGES;
					continue;
				}
				if (row[colIndex] == null) {
					row[colIndex] = StringUtils.EMPTY;
					continue;
				}

				Field field = selectFields[colIndex].getField();
				if (field.equals(nameFiled)) {
					nameValue = row[colIndex];
					if (nameValue == null) {
                        nameValue = StringUtils.EMPTY;
                    }
				}

                row[colIndex] = wrapFieldValue(row[colIndex], nameValue, field);
			}
		}
		
		return JSONUtils.toJSONObject(
				new String[] { "total", "data" },
				new Object[] { total, data });
	}

    /**
     * see FormsBuilder#wrapFieldValue(Record, EasyMeta)
     * @param value
     * @param nameValue
     * @param field
     * @return
     */
    protected Object wrapFieldValue(Object value, Object nameValue, Field field) {
        EasyMeta fieldEasy = EasyMeta.valueOf(field);
        if (fieldEasy.getDisplayType() == DisplayType.ID) {
            return FieldValueWrapper.wrapMixValue((ID) value, (String) nameValue);
        } else if (fieldEasy.getDisplayType() == DisplayType.CLASSIFICATION) {
            return FieldValueWrapper.instance.wrapFieldValue(value, fieldEasy, true);
        } else {
            return FieldValueWrapper.instance.wrapFieldValue(value, fieldEasy);
        }
    }

	/**
	 * 验证（引用）字段权限
	 * 
	 * @param field
	 * @param original
	 * @return
	 */
	private boolean checkHasJoinFieldPrivileges(SelectItem field, Object[] original) {
		if (this.queryJoinFields == null) {
			return true;
		}
		
		String[] fieldPath = field.getFieldPath().split("\\.");
		if (fieldPath.length == 1) {
			return true;
		}
		
		int fieldIndex = queryJoinFields.get(fieldPath[0]);
		Object check = original[fieldIndex];
		return check == null || Application.getSecurityManager().allowRead(user, (ID) check);
	}
}
