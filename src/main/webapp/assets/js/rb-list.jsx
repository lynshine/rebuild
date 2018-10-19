// ~~ 数据列表
class RbList extends React.Component {
    constructor(props) {
        super(props)
        
        this.__sortFieldKey = 'SortField-' + this.props.config.entity
        this.__columnWidthKey = 'ColumnWidth-' + this.props.config.entity + '.'
        
        let sort = ($storage.get(this.__sortFieldKey) || ':').split(':')
        let fields = props.config.fields
        for (let i = 0; i < fields.length; i++){
            let cw = $storage.get(this.__columnWidthKey + fields[i].field)
            if (!!cw && ~~cw > 40) fields[i].width = ~~cw
            if (sort[0] == fields[i].field) fields[i].sort = sort[1]
        }
        props.config.fields = null
        this.state = { ...props, fields: fields, rowData: [], noData: false, checkedAll: false, pageNo: 1, pageSize: 20 }
        
        this.toggleAllRow = this.toggleAllRow.bind(this)
        this.setPageNo = this.setPageNo.bind(this)
        this.setPageSize = this.setPageSize.bind(this)
        
        this.__defaultColumnWidth = $('#react-list').width() / 10
        if (this.__defaultColumnWidth < 130) this.__defaultColumnWidth = 130
    }
    render() {
        let that = this;
        const lastIndex = this.state.fields.length
        return (
        <div>
            <div className="row rb-datatable-body">
            <div className="col-sm-12">
                <div className="rb-scroller" ref="rblist-scroller">
                    <table className="table table-hover table-striped">
                    <thead>
                        <tr>
                            <th className="column-checkbox">
                                <div><label className="custom-control custom-control-sm custom-checkbox"><input className="custom-control-input" type="checkbox" checked={this.state.checkedAll} onClick={this.toggleAllRow} /><span className="custom-control-label"></span></label></div>
                            </th>
                            {this.state.fields.map((item, index) =>{
                                let columnWidth = (item.width || that.__defaultColumnWidth) + 'px'
                                let styles = { width: columnWidth }
                                let sortClazz = item.sort || ''
                                return (<th key={'column-' + item.field} style={styles} className="sortable unselect" onClick={this.fieldSort.bind(this, item.field)}><div style={styles}>{item.label}<i className={'zmdi ' + sortClazz}></i><i className="split" data-field={item.field}></i></div></th>)
                            })}
                            <th className="column-empty"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.rowData.map((item, index) => {
                            let lastGhost = item[lastIndex]
                            return (<tr key={'row-' + lastGhost[0]} className={lastGhost[3] ? 'table-active' : ''} onClick={this.clickRow.bind(this, index, false)}>
                                <td className="column-checkbox">
                                    <div><label className="custom-control custom-control-sm custom-checkbox"><input className="custom-control-input" type="checkbox" checked={lastGhost[3]} onClick={this.clickRow.bind(this, index, true)} /><span className="custom-control-label"></span></label></div>
                                </td>
                                {item.map((cell, index) => {
                                    return that.renderCell(cell, index, lastGhost)
                                })}
                                <td className="column-empty"></td>
                            </tr>)
                        })}    
                    </tbody>
                    </table>
                    {this.state.noData == true ? <div className="nodata"><span className="modal-main-icon zmdi zmdi-info-outline"/><p>没有检索到数据</p></div> : null}
                </div>
            </div></div>
            <RbListPagination pageNo={this.state.pageNo} pageSize={this.state.pageSize} rowTotal={this.state.rowTotal} $$$parent={this} />
        </div>);
    }
    componentDidMount() {
        const scroller = $(this.refs['rblist-scroller'])
        scroller.perfectScrollbar()
        
        let that = this
        scroller.find('th .split').draggable({ containment: '.rb-datatable-body', axis: 'x', helper: 'clone', stop: function(event, ui){
            let field = $(event.target).data('field')
            let left = ui.position.left - 2
            if (left < 40) left = 40  // min
            let fields = that.state.fields
            for (let i = 0; i < fields.length; i++){
                if (fields[i].field == field){
                    fields[i].width = left
                    $storage.set(that.__columnWidthKey + field, left)
                    break
                }
            }
            that.setState({ fields: fields })
        }})
        this.fetchList()
    }
    componentDidUpdate() {
        let that = this
        this.__selectedRows = []
        this.state.rowData.forEach((item) => {
            let lastGhost = item[that.state.fields.length]
            if (lastGhost[3] == true) that.__selectedRows.push(lastGhost)
        })
        
        $('.J_delete, .J_view, .J_edit').attr('disabled', true)
        let len = this.__selectedRows.length
        if (len > 0) $('.J_delete').attr('disabled', false)
        if (len == 1) $('.J_view, .J_edit').attr('disabled', false)
    }
    
    fetchList(filter) {
        let fields = []
        let field_sort = null
        this.state.fields.forEach(function(item){
            fields.push(item.field)
            if (!!item.sort) field_sort = item.field + ':' + item.sort.replace('sort-', '')
        });
        const entity = this.props.config.entity
        this.lastFilter = filter || this.lastFilter
        let query = {
            entity: entity,
            fields: fields,
            pageNo: this.state.pageNo,
            pageSize: this.state.pageSize,
            sort: field_sort,
            filter: this.lastFilter,
            reload: true,
        };
        let that = this;
        $('#react-list').addClass('rb-loading-active')
        $.post(rb.baseUrl + '/app/' + entity + '/data-list', JSON.stringify(query), function(res){
            if (res.error_code == 0){
                let rowdata = res.data.data
                if (rowdata.length > 0) {
                    let lastIndex = rowdata[0].length - 1
                    rowdata = rowdata.map((item) => {
                        item[lastIndex][3] = false  // Checked?
                        return item
                    })
                }
                that.setState({ noData: rowdata.length == 0, rowData: rowdata, rowTotal: res.data.total })
            }else{
                rb.notice(res.error_msg || '加载失败，请稍后重试', 'danger')
            }
            $('#react-list').removeClass('rb-loading-active')
        });
    }
    
    // 渲染表格及相关事件处理
    
    renderCell(cellVal, index, lastGhost) {
        if (this.state.fields.length == index) return null
        if (!!!cellVal) return <td><div></div></td>
       
        const field = this.state.fields[index]
        let styles = { width: (this.state.fields[index].width || this.__defaultColumnWidth) + 'px' }
        if (field.type == 'IMAGE') {
            cellVal = JSON.parse(cellVal || '[]')
            return (<td><div style={styles} className="img-field column-imgs">
                {cellVal.map((item)=>{
                    return <span><a href={'#!/Preview/' + item} className="img-thumbnail img-upload"><img src={rb.storageUrl + item + '?imageView2/2/w/100/interlace/1/q/100'} /></a></span>
                })}<div className="clearfix" /></div></td>)
        } else if (field.type == 'FILE') {
            cellVal = JSON.parse(cellVal || '[]')
            return (<td><div style={styles} className="column-files"><ul className="list-unstyled">
                {cellVal.map((item)=>{
                    let fileName = __fileCutName(item)
                    return <li className="text-truncate"><a href={'#!/Preview/' + item}>{fileName}</a></li>
                })}</ul></div></td>)
        } else if (field.type == 'REFERENCE'){
            return <td><div style={styles}><a href={'#!/View/' + cellVal[2][0] + '/' + cellVal[0]} onClick={() => this.clickView(cellVal)}>{cellVal[1]}</a></div></td>
        } else if (field.field == this.props.config.nameField){
            cellVal = lastGhost
            return <td><div style={styles}><a href={'#!/View/' + cellVal[2][0] + '/' + cellVal[0]} onClick={() => this.clickView(cellVal)} className="column-main">{cellVal[1]}</a></div></td>
        } else if (field.type == 'URL') {
            return <td><div style={styles}><a href={rb.baseUrl + '/common/url-safe?url=' + encodeURIComponent(cellVal)} className="column-url" target="_blank">{cellVal}</a></div></td>
        } else if (field.type == 'EMAIL') {
            return <td><div style={styles}><a href={'mailto:' + cellVal} className="column-url">{cellVal}</a></div></td>
        } else {
            return <td><div style={styles}>{cellVal}</div></td>
        }
    }
    
    toggleAllRow(e) {
        let checked = this.state.checkedAll == false
        let _rowData = this.state.rowData
        _rowData = _rowData.map((item) => {
            item[item.length - 1][3] = checked  // Checked?
            return item;
        });
        this.setState({ checkedAll: checked, rowData: _rowData })
        return false;
    }
    clickRow(rowIndex, holdOthers, e) {
        if (e.target.tagName == 'SPAN') return false
        e.stopPropagation()
        e.nativeEvent.stopImmediatePropagation()
        
        let _rowData = this.state.rowData
        let lastIndex = _rowData[0].length - 1
        if (holdOthers == true){
            let item = _rowData[rowIndex];
            item[lastIndex][3] = item[lastIndex][3] == false  // Checked?
            _rowData[rowIndex] = item
        } else {
            _rowData = _rowData.map((item, index) => {
                item[lastIndex][3] = index == rowIndex
                return item
            })
        }
        this.setState({ rowData: _rowData })
        return false
    }
    
    clickView(cellVal) {
        rb.RbViewModal({ id: cellVal[0], entity: cellVal[2][0] })
        return false;
    }
    
    // 分页
    
    setPageNo(pageNo) {
        let that = this
        this.setState({ pageNo: pageNo || 1 }, function(){
            that.fetchList()
        })
    }
    setPageSize(pageSize) {
        console.log(pageSize)
        let that = this
        this.setState({ pageNo: 1, pageSize: pageSize || 20 }, function(){
            that.fetchList()
        })
    }
    
    // 外部接口
    
    getSelectedRows() {
        return this.__selectedRows
    }
    
    getSelectedIds() {
        if (!this.__selectedRows || this.__selectedRows.length < 1) { rb.notice('未选中任何记录'); return [] }
        let ids = this.__selectedRows.map((item) => { return item[0] })
        return ids
    }
    
    search(filter) {
        this.fetchList(filter)
    }
    
    reload() {
        this.fetchList()
    }
    
    // 配置相关
    
    fieldSort(field, e) {
        let fields = this.state.fields;
        for (let i = 0; i < fields.length; i++){
            if (fields[i].field == field){
                if (fields[i].sort == 'sort-asc') fields[i].sort = 'sort-desc'
                else fields[i].sort = 'sort-asc'
                $storage.set(this.__sortFieldKey, field + ':' + fields[i].sort)
            } else {
                fields[i].sort = null
            }
        }
        let that = this
        this.setState({ fields: fields }, function(){
            that.fetchList()
        })
        
        e.stopPropagation()
        e.nativeEvent.stopImmediatePropagation()
        return false
    }
}

// 分页组件
class RbListPagination extends React.Component {
    constructor(props) {
        super(props)
        this.prev = this.prev.bind(this)
        this.next = this.next.bind(this)
    }
    render() {
        let props = this.props
        this.pageTotal = Math.ceil(props.rowTotal / props.pageSize)
        if (this.pageTotal <= 0) this.pageTotal = 1
        const pages = calcPages(this.pageTotal, props.pageNo)
        return (
            <div className="row rb-datatable-footer">
                <div className="col-sm-5">
                    <div className="dataTables_info">{props.rowTotal > 0 ? `共 ${props.rowTotal} 条数据` : ''}</div>
                </div>
                <div className="col-sm-7">
                    <div className="dataTables_paginate paging_simple_numbers">
                        <ul className="pagination">
                            {props.pageNo > 1 && <li className="paginate_button page-item"><a className="page-link" onClick={this.prev}><span className="icon zmdi zmdi-chevron-left"></span></a></li>}
                            {pages.map((item) => {
                                if (item == '.') return <li key={'page-' + item} className="paginate_button page-item disabled"><a className="page-link">...</a></li>
                                else return <li key={'page-' + item} className={'paginate_button page-item ' + (props.pageNo == item && 'active')}><a href="javascript:;" className="page-link" onClick={this.goto.bind(this, item)}>{item}</a></li>
                            })}
                            {props.pageNo != this.pageTotal && <li className="paginate_button page-item"><a className="page-link" onClick={this.next}><span className="icon zmdi zmdi-chevron-right"></span></a></li>}
                        </ul>
                    </div>
                </div>
            </div>
        )
    }
    prev() {
        if (this.props.pageNo == 1) return
        else this.props.$$$parent.setPageNo(this.props.pageNo - 1)
    }
    next() {
        if (this.props.pageNo == this.pageTotal) return
        else this.props.$$$parent.setPageNo(this.props.pageNo + 1)
    }
    goto(pageNo) {
        if (this.props.pageNo == pageNo) return
        else this.props.$$$parent.setPageNo(pageNo)
    }
}

// -- Usage

var rb = rb || {}

// props = { config }
rb.RbList = function(props, target) {
    return renderRbcomp(<RbList {...props} />, target || 'react-list')
}

// props = { rowTotal, pageSize, pageNo }
rb.RbListPagination = function(props, target) {
    return renderRbcomp(<RbListPagination {...props} />, target || 'pagination')
}

// 列表页面初始化
const RbListPage = {
    _RbList: null,
    _ModalColumns: null,
        
    // @config - List config
    // @entity - [Label, Name, Icon]
    // @ep - Privileges of this entity
    init: function(config, entity, ep) {
        this._RbList = renderRbcomp(<RbList config={config} />, 'react-list')
        
        QuickFilter.init('.input-search', entity[1]);
        
        $('.J_new').click(function(){
            rb.RbFormModal({ title: `新建${entity[0]}`, entity: entity[1], icon: entity[2] })
        })
        
        let that = this
        
        $('.J_delete').click(function(){
            let selected = that._RbList.getSelectedRows()
            if (selected.length < 1) return
            rb.alter('确认删除选中的 ' + selected.length + ' 条记录吗？', '删除确认', { type: 'danger', confirm: function(){
                let ids = selected.map((item)=>{
                    return item[0]
                })
                
                $(this.refs['rbalter']).find('.btn').button('loading')
                let thatModal = this
                $.post(rb.baseUrl + '/app/entity/record-delete?id=' + ids.join(','), function(res){
                    if (res.error_code == 0){
                        that._RbList.reload()
                        thatModal.hide()
                        if (res.data.deleted == res.data.requests) rb.notice('删除成功', 'success')
                        else rb.notice('已成功删除 ' + res.data.deleted + ' 条记录', 'success')
                    } else {
                        rb.notice(res.error_msg || '删除失败，请稍后重试', 'danger')
                    }
                })
            } })
        })
        
        $('.J_edit').click(function(){
            let selected = that._RbList.getSelectedRows()
            if (selected.length == 1) {
                selected = selected[0]
                rb.RbFormModal({ id: selected[0], title: `编辑${entity[0]}`, entity: entity[1], icon: entity[2] })
            }
        })
        
        $('.J_view').click(function(){
            let selected = that._RbList.getSelectedRows()
            if (selected.length == 1) {
                selected = selected[0]
                rb.RbViewModal({ id: selected[0], entity: entity[1] })
            }
        })
        
        $('.J_assign').click(function(){
            let ids = that._RbList.getSelectedIds()
            if (ids.length < 1) return
            rb.AssignDialog({ entity: entity[1], ids: ids })
        })
        $('.J_share').click(function(){
            let ids = that._RbList.getSelectedIds()
            if (ids.length < 1) return
            rb.ShareDialog({ entity: entity[1], ids: ids })
        })
        
        $('.J_columns').click(function(){
            if (that._ModalColumns) that._ModalColumns.show()
            else that._ModalColumns = rb.modal(`${rb.baseUrl}/page/general-entity/show-columns?entity=${entity[1]}`, '设置列显示')
        })
        
        // Privileges
        if (ep) {
            if (ep.C === false) $('.J_new').remove()
            if (ep.D === false) $('.J_delete').remove()
            if (ep.U === false) $('.J_edit').remove()
            if (ep.A === false) $('.J_assign').remove()
            if (ep.S === false) $('.J_share').remove()
            
            let divi = $('.J_actions .dropdown-menu').children().first()
            if (divi.hasClass('dropdown-divider')) divi.remove()
        }
    },
    
    closeModal() {
        if (this._ModalColumns) this._ModalColumns.hide()
    },
    resizeModal() {
        if (this._ModalColumns) this._ModalColumns.resize()
    }
}

// 列表快速查询
const QuickFilter = {
    _ModalQFields: null,
    
    // @el - 控件
    // @entity - 实体
    init(el, entity) {
        this.root = $(el)
        this.entity = entity
        this.initEvent()
        this.loadFilter()
    },
    initEvent() {
        let that = this
        let btn = this.root.find('.J_search-btn').click(function(){
            let val = $val(that.root.find('.J_search-text'))
            that.fireFilter(val)
        })
        this.root.find('.J_search-text').keydown(function(event){
            if (event.which == 13) btn.trigger('click')
        })
        this.root.find('.J_qfields').click(function(event){
            that.showQFieldsModal()
        })
    },
    
    loadFilter() {
        let that = this
        $.get(`${rb.baseUrl}/app/${this.entity}/advfilter/quick`, function(res){
            that.filterExp = res.data || { items: [] }
            let qFields = []
            that.filterExp.items.forEach(function(item){
                qFields.push(item.label)
            })
            that.root.find('.J_search-text').attr('placeholder', '搜索 ' + qFields.join('/'))
        })
    },
    fireFilter(val) {
        if (!this.filterExp || this.filterExp.items.length == 0){
            rb.notice('请先设置查询字段')
            let that = this
            $setTimeout(function(){
                that.showQFieldsModal()
            }, 1500)
            return
        }
        
        this.filterExp.values = { 1: val }
        RbListPage._RbList.search(this.filterExp)
    },
    
    showQFieldsModal() {
        if (this._ModalQFields) this._ModalQFields.show()
        else this._ModalQFields = rb.modal(`${rb.baseUrl}/page/general-entity/quick-fields?entity=${this.entity}`, '设置查询字段')
    },
    hideQFieldsModal() {
        if (this._ModalQFields) this._ModalQFields.hide()
    }
};