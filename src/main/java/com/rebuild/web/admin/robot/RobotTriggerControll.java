/*
rebuild - Building your business-systems freely.
Copyright (C) 2019 devezhao <zhaofang123@gmail.com>

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

package com.rebuild.web.admin.robot;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.lang.StringEscapeUtils;
import org.apache.commons.lang.StringUtils;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.ModelAndView;

import com.rebuild.server.Application;
import com.rebuild.server.business.trigger.ActionFactory;
import com.rebuild.server.business.trigger.ActionType;
import com.rebuild.server.business.trigger.TriggerAction;
import com.rebuild.server.metadata.MetadataHelper;
import com.rebuild.server.metadata.entityhub.EasyMeta;
import com.rebuild.utils.JSONUtils;
import com.rebuild.web.BasePageControll;

import cn.devezhao.persist4j.Entity;
import cn.devezhao.persist4j.engine.ID;

/**
 * @author devezhao zhaofang123@gmail.com
 * @since 2019/05/23
 */
@Controller
@RequestMapping("/admin/robot/")
public class RobotTriggerControll extends BasePageControll {
	
	@RequestMapping("triggers")
	public ModelAndView pageList(HttpServletRequest request) throws IOException {
		ModelAndView mv = createModelAndView("/admin/robot/trigger-list.jsp");
		return mv;
	}
	
	@RequestMapping("trigger/{id}")
	public ModelAndView pageEditor(@PathVariable String id, 
			HttpServletRequest request, HttpServletResponse response) throws IOException {
		ID configId = ID.valueOf(id);
		Object[] config = Application.createQuery(
				"select belongEntity,actionType,when,whenFilter,actionContent,priority from RobotTriggerConfig where configId = ?")
				.setParameter(1, configId)
				.unique();
		if (config == null) {
			response.sendError(404, "触发器不存在");
			return null;
		}
		
		Entity sourceEntity = MetadataHelper.getEntity((String) config[0]);
		ActionType actionType = ActionType.valueOf((String) config[1]);
		
		ModelAndView mv = createModelAndView("/admin/robot/trigger-editor.jsp");
		mv.getModel().put("configId", configId);
		mv.getModel().put("sourceEntity", sourceEntity.getName());
		mv.getModel().put("sourceEntityLabel", EasyMeta.getLabel(sourceEntity));
		mv.getModel().put("actionType", actionType.name());
		mv.getModel().put("actionTypeLabel", actionType.getDisplayName());
		mv.getModel().put("when", config[2]);
		mv.getModel().put("whenFilter", StringUtils.defaultIfBlank((String) config[3], JSONUtils.EMPTY_OBJECT_STR));
		mv.getModel().put("actionContent", StringUtils.defaultIfBlank((String) config[4], JSONUtils.EMPTY_OBJECT_STR));
		mv.getModel().put("priority", config[5]);
		return mv;
	}
	
	@RequestMapping("trigger/available-actions")
	public void getAvailableActions(HttpServletRequest request, HttpServletResponse response) throws IOException {
		ActionType[] ts = ActionFactory.getAvailableActions();
		List<String[]> list = new ArrayList<String[]>();
		for (ActionType t : ts) {
			list.add(new String[] { t.name(), t.getDisplayName() });
		}
		writeSuccess(response, list);
	}
	
	@RequestMapping("trigger/available-entities")
	public void getAvailableEntities(HttpServletRequest request, HttpServletResponse response) throws IOException {
		String actionType = getParameterNotNull(request, "action");
		TriggerAction action = ActionFactory.createAction(actionType);
		
		List<String[]> list = new ArrayList<String[]>();
		for (Entity e : MetadataHelper.getEntities()) {
			if (!MetadataHelper.hasPrivilegesField(e)) {
				if (e.getMasterEntity() != null) {
					// 允许明细实体
				} else {
					continue;
				}
			}
			
			if (action.isUsableSourceEntity(e.getEntityCode())) {
				list.add(new String[] { e.getName(), EasyMeta.getLabel(e) });
			}
		}
		writeSuccess(response, list);
	}
	
	@RequestMapping("trigger/list")
	public void triggerList(HttpServletRequest request, HttpServletResponse response) throws IOException {
		String belongEntity = getParameter(request, "entity");
		String sql = "select configId,when,actionType,belongEntity,belongEntity from RobotTriggerConfig";
		if (StringUtils.isNotBlank(belongEntity)) {
			sql += " where belongEntity = '" + StringEscapeUtils.escapeSql(belongEntity) + "'";
		}
		sql += " order by modifiedOn desc";
		
		Object[][] array = Application.createQuery(sql).array();
		for (Object[] o : array) {
			o[2] = ActionType.valueOf((String) o[2]).getDisplayName();
			o[4] = EasyMeta.getLabel(MetadataHelper.getEntity((String) o[4]));
		}
		writeSuccess(response, array);
	}
}
