/*
Copyright (c) REBUILD <https://getrebuild.com/> and its owners. All rights reserved.

rebuild is dual-licensed under commercial and open source licenses (GPLv3).
See LICENSE and COMMERCIAL in the project root for license information.
*/

package com.rebuild.web.base.configuration;

import cn.devezhao.commons.CalendarUtils;
import cn.devezhao.commons.web.ServletUtils;
import cn.devezhao.persist4j.Record;
import cn.devezhao.persist4j.engine.ID;
import com.alibaba.fastjson.JSON;
import com.rebuild.server.Application;
import com.rebuild.server.configuration.ConfigEntry;
import com.rebuild.server.configuration.portals.AdvFilterManager;
import com.rebuild.server.configuration.portals.ShareToManager;
import com.rebuild.server.metadata.EntityHelper;
import com.rebuild.server.service.configuration.AdvFilterService;
import com.rebuild.server.service.query.AdvFilterParser;
import com.rebuild.utils.JSONUtils;
import com.rebuild.web.BaseControll;
import com.rebuild.web.PortalsConfiguration;
import org.apache.commons.lang.StringUtils;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * 高级查询
 * 
 * @author devezhao
 * @since 10/14/2018
 */
@Controller
@RequestMapping("/app/{entity}/")
public class AdvFilterControll extends BaseControll implements PortalsConfiguration {

	@RequestMapping("advfilter/post")
	@Override
	public void sets(@PathVariable String entity, 
			HttpServletRequest request, HttpServletResponse response) throws IOException {
		ID user = getRequestUser(request);
		ID filterId = getIdParameter(request, "id");
		String filterName = getParameter(request, "name");

        // 不是自己的就另存为
		if (filterId != null && !ShareToManager.isSelf(user, filterId)) {
			if (StringUtils.isBlank(filterName)) {
				ConfigEntry o = AdvFilterManager.instance.getAdvFilter(filterId);
				if (o != null) {
					filterName = o.getString("name") + "-复制";
				}
			}
			filterId = null;
		}
		
		JSON filter = ServletUtils.getRequestJson(request);
		Record record;
		if (filterId == null) {
			record = EntityHelper.forNew(EntityHelper.FilterConfig, user);
			record.setString("belongEntity", entity);
			if (StringUtils.isBlank(filterName)) {
				filterName = "查询-" + CalendarUtils.getPlainDateFormat().format(CalendarUtils.now());
			}
		} else {
			record = EntityHelper.forUpdate(filterId, user);
		}
		
		record.setString("config", filter.toJSONString());
		putCommonsFields(request, record);
        if (StringUtils.isNotBlank(filterName)) {
            record.setString("filterName", filterName);
        }
        record = Application.getBean(AdvFilterService.class).createOrUpdate(record);
		
		writeSuccess(response, JSONUtils.toJSONObject("id", record.getPrimary()));
	}
	
	@RequestMapping("advfilter/get")
	@Override
	public void gets(@PathVariable String entity, 
			HttpServletRequest request, HttpServletResponse response) {
		ID filterId = getIdParameter(request, "id");
		ConfigEntry filter = AdvFilterManager.instance.getAdvFilter(filterId);
		if (filter == null) {
			writeFailure(response, "无效过滤条件");
		} else {
			writeSuccess(response, filter.toJSON());
		}
	}
	
	@RequestMapping("advfilter/list")
	public void list(@PathVariable String entity, 
			HttpServletRequest request, HttpServletResponse response) {
		ID user = getRequestUser(request);
		JSON filters = AdvFilterManager.instance.getAdvFilterList(entity, user);
		writeSuccess(response, filters);
	}
	
	@RequestMapping("advfilter/test-equation")
	public void testEquation(HttpServletRequest request, HttpServletResponse response) {
		final String equation = ServletUtils.getRequestString(request);
		if (StringUtils.isBlank(equation)) {
			writeSuccess(response);
			return;
		}
		
		String valid = AdvFilterParser.validEquation(equation);
		if (valid == null) {
			writeFailure(response);
		} else {
			writeSuccess(response);
		}
	}
}
