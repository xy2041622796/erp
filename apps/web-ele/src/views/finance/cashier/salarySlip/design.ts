export interface SqlFieldDef {
  field: string;
  type: string;
  nullable: string;
  defaultValue?: string;
  comment: string;
}

export interface SqlTableDef {
  tableName: string;
  purpose: string;
  fields: SqlFieldDef[];
}

export interface JobLevelDef {
  levelCode: string;
  levelName: string;
  levelSeries: string;
  levelSeriesName: string;
  exportTemplateCode: string;
  sortNo: number;
}

export interface TemplateColumnDef {
  title: string;
  source: string;
  key: string;
}

export interface ExportTemplateDef {
  templateCode: string;
  templateName: string;
  appliesTo: string;
  columns: TemplateColumnDef[];
}

export const salarySlipSqlTables: SqlTableDef[] = [
  {
    tableName: 'Bil_Salary_Slip',
    purpose: '工资条主表补充发放月份、职级和模板识别字段，便于按职级切换导出模板。',
    fields: [
      { field: 'pay_month', type: 'varchar(7)', nullable: 'Y', comment: '工资发放月份，格式 YYYY-MM' },
      { field: 'employee_id', type: 'varchar(50)', nullable: 'N', comment: '员工ID，关联员工主数据' },
      { field: 'employee_code', type: 'varchar(64)', nullable: 'N', comment: '员工工号，导出与去重使用' },
      { field: 'job_level_code', type: 'varchar(32)', nullable: 'N', comment: '职级编码，例如 P1/M2/E3/D1' },
      { field: 'job_level_name', type: 'varchar(64)', nullable: 'N', comment: '职级名称，例如 专员/经理/专家/总监' },
      { field: 'job_series', type: 'varchar(16)', nullable: 'N', comment: '职级序列：P/M/E/D' },
      { field: 'job_series_name', type: 'varchar(32)', nullable: 'N', comment: '职级序列名称：员工/管理/专家/高管' },
      { field: 'export_template_code', type: 'varchar(32)', nullable: 'N', defaultValue: "'STAFF'", comment: '导出模板编码：STAFF/MANAGER/EXPERT/EXECUTIVE' },
      { field: 'export_template_name', type: 'varchar(64)', nullable: 'Y', comment: '导出模板名称，便于页面展示' },
    ],
  },
  {
    tableName: 'Bil_Job_Level',
    purpose: '职级主数据表，统一管理员工职级、序列与导出模板映射。',
    fields: [
      { field: 'rowid', type: 'varchar(50)', nullable: 'N', comment: '主键' },
      { field: 'level_code', type: 'varchar(32)', nullable: 'N', comment: '职级编码' },
      { field: 'level_name', type: 'varchar(64)', nullable: 'N', comment: '职级名称' },
      { field: 'level_series', type: 'varchar(16)', nullable: 'N', comment: '职级序列：P/M/E/D' },
      { field: 'level_series_name', type: 'varchar(32)', nullable: 'N', comment: '序列名称' },
      { field: 'export_template_code', type: 'varchar(32)', nullable: 'N', comment: '默认导出模板编码' },
      { field: 'sort_no', type: 'int', nullable: 'N', defaultValue: '0', comment: '排序号' },
      { field: 'is_enabled', type: 'tinyint(1)', nullable: 'N', defaultValue: '1', comment: '是否启用' },
      { field: 'remark', type: 'varchar(255)', nullable: 'Y', comment: '备注' },
    ],
  },
  {
    tableName: 'Bil_Salary_Export_Template',
    purpose: '工资条导出模板主表，配置不同职级对应的模板。',
    fields: [
      { field: 'rowid', type: 'varchar(50)', nullable: 'N', comment: '主键' },
      { field: 'template_code', type: 'varchar(32)', nullable: 'N', comment: '模板编码' },
      { field: 'template_name', type: 'varchar(64)', nullable: 'N', comment: '模板名称' },
      { field: 'template_scope', type: 'varchar(32)', nullable: 'N', comment: '适用范围：STAFF/MANAGER/EXPERT/EXECUTIVE' },
      { field: 'is_default', type: 'tinyint(1)', nullable: 'N', defaultValue: '0', comment: '是否默认模板' },
      { field: 'is_enabled', type: 'tinyint(1)', nullable: 'N', defaultValue: '1', comment: '是否启用' },
      { field: 'remark', type: 'varchar(255)', nullable: 'Y', comment: '备注' },
    ],
  },
  {
    tableName: 'Bil_Salary_Export_Template_Item',
    purpose: '工资条导出模板明细表，定义导出列顺序、来源字段和工资项编码。',
    fields: [
      { field: 'rowid', type: 'varchar(50)', nullable: 'N', comment: '主键' },
      { field: 'template_id', type: 'varchar(50)', nullable: 'N', comment: '模板主表ID' },
      { field: 'column_title', type: 'varchar(64)', nullable: 'N', comment: '导出列标题' },
      { field: 'source_type', type: 'varchar(16)', nullable: 'N', comment: '来源：header/detail/calc' },
      { field: 'source_key', type: 'varchar(64)', nullable: 'N', comment: '主表字段或计算字段key' },
      { field: 'item_code', type: 'varchar(64)', nullable: 'Y', comment: '工资项编码，detail 类型时使用' },
      { field: 'sort_no', type: 'int', nullable: 'N', defaultValue: '0', comment: '列顺序' },
      { field: 'is_enabled', type: 'tinyint(1)', nullable: 'N', defaultValue: '1', comment: '是否启用' },
    ],
  },
];

export const jobLevelDefs: JobLevelDef[] = [
  { levelCode: 'P1', levelName: '初级专员', levelSeries: 'P', levelSeriesName: '员工序列', exportTemplateCode: 'STAFF', sortNo: 10 },
  { levelCode: 'P2', levelName: '专员', levelSeries: 'P', levelSeriesName: '员工序列', exportTemplateCode: 'STAFF', sortNo: 20 },
  { levelCode: 'P3', levelName: '高级专员', levelSeries: 'P', levelSeriesName: '员工序列', exportTemplateCode: 'STAFF', sortNo: 30 },
  { levelCode: 'P4', levelName: '资深专员', levelSeries: 'P', levelSeriesName: '员工序列', exportTemplateCode: 'STAFF', sortNo: 40 },
  { levelCode: 'M1', levelName: '主管', levelSeries: 'M', levelSeriesName: '管理序列', exportTemplateCode: 'MANAGER', sortNo: 110 },
  { levelCode: 'M2', levelName: '副经理', levelSeries: 'M', levelSeriesName: '管理序列', exportTemplateCode: 'MANAGER', sortNo: 120 },
  { levelCode: 'M3', levelName: '经理', levelSeries: 'M', levelSeriesName: '管理序列', exportTemplateCode: 'MANAGER', sortNo: 130 },
  { levelCode: 'M4', levelName: '高级经理', levelSeries: 'M', levelSeriesName: '管理序列', exportTemplateCode: 'MANAGER', sortNo: 140 },
  { levelCode: 'E1', levelName: '初级专家', levelSeries: 'E', levelSeriesName: '专家序列', exportTemplateCode: 'EXPERT', sortNo: 210 },
  { levelCode: 'E2', levelName: '专家', levelSeries: 'E', levelSeriesName: '专家序列', exportTemplateCode: 'EXPERT', sortNo: 220 },
  { levelCode: 'E3', levelName: '高级专家', levelSeries: 'E', levelSeriesName: '专家序列', exportTemplateCode: 'EXPERT', sortNo: 230 },
  { levelCode: 'E4', levelName: '首席专家', levelSeries: 'E', levelSeriesName: '专家序列', exportTemplateCode: 'EXPERT', sortNo: 240 },
  { levelCode: 'D1', levelName: '总监', levelSeries: 'D', levelSeriesName: '高管序列', exportTemplateCode: 'EXECUTIVE', sortNo: 310 },
  { levelCode: 'D2', levelName: '副总经理', levelSeries: 'D', levelSeriesName: '高管序列', exportTemplateCode: 'EXECUTIVE', sortNo: 320 },
  { levelCode: 'D3', levelName: '总经理', levelSeries: 'D', levelSeriesName: '高管序列', exportTemplateCode: 'EXECUTIVE', sortNo: 330 },
  { levelCode: 'D4', levelName: '公司负责人', levelSeries: 'D', levelSeriesName: '高管序列', exportTemplateCode: 'EXECUTIVE', sortNo: 340 },
];

export const exportTemplateDefs: ExportTemplateDef[] = [
  {
    templateCode: 'STAFF',
    templateName: '普通员工模板',
    appliesTo: 'P1-P4 员工序列',
    columns: [
      { title: '员工姓名', source: 'header', key: 'employeeName' },
      { title: '员工工号', source: 'header', key: 'employeeCode' },
      { title: '部门', source: 'header', key: 'departName' },
      { title: '工资月份', source: 'header', key: 'salaryMonth' },
      { title: '工资发放月份', source: 'header', key: 'payMonth' },
      { title: '基本工资', source: 'detail', key: 'basic_salary' },
      { title: '绩效工资', source: 'detail', key: 'performance_salary' },
      { title: '社保个人', source: 'detail', key: 'social_security_personal' },
      { title: '公积金个人', source: 'detail', key: 'housing_fund_personal' },
      { title: '个税', source: 'detail', key: 'personal_income_tax' },
      { title: '实发工资', source: 'header', key: 'realPay' },
    ],
  },
  {
    templateCode: 'MANAGER',
    templateName: '管理层模板',
    appliesTo: 'M1-M4 管理序列',
    columns: [
      { title: '员工姓名', source: 'header', key: 'employeeName' },
      { title: '员工工号', source: 'header', key: 'employeeCode' },
      { title: '部门', source: 'header', key: 'departName' },
      { title: '工资月份', source: 'header', key: 'salaryMonth' },
      { title: '工资发放月份', source: 'header', key: 'payMonth' },
      { title: '岗位工资', source: 'detail', key: 'base_pay' },
      { title: '管理津贴', source: 'detail', key: 'manage_allowance' },
      { title: '团队绩效', source: 'detail', key: 'team_bonus' },
      { title: '年终奖分摊', source: 'detail', key: 'annual_bonus_share' },
      { title: '个税', source: 'detail', key: 'personal_income_tax' },
      { title: '实发工资', source: 'header', key: 'realPay' },
    ],
  },
  {
    templateCode: 'EXPERT',
    templateName: '专家模板',
    appliesTo: 'E1-E4 专家序列',
    columns: [
      { title: '员工姓名', source: 'header', key: 'employeeName' },
      { title: '员工工号', source: 'header', key: 'employeeCode' },
      { title: '部门', source: 'header', key: 'departName' },
      { title: '工资月份', source: 'header', key: 'salaryMonth' },
      { title: '工资发放月份', source: 'header', key: 'payMonth' },
      { title: '基本工资', source: 'detail', key: 'basic_salary' },
      { title: '技术津贴', source: 'detail', key: 'technical_allowance' },
      { title: '项目奖金', source: 'detail', key: 'project_bonus' },
      { title: '专家补贴', source: 'detail', key: 'expert_allowance' },
      { title: '个税', source: 'detail', key: 'personal_income_tax' },
      { title: '实发工资', source: 'header', key: 'realPay' },
    ],
  },
  {
    templateCode: 'EXECUTIVE',
    templateName: '高管模板',
    appliesTo: 'D1-D4 高管序列',
    columns: [
      { title: '员工姓名', source: 'header', key: 'employeeName' },
      { title: '员工工号', source: 'header', key: 'employeeCode' },
      { title: '工资月份', source: 'header', key: 'salaryMonth' },
      { title: '工资发放月份', source: 'header', key: 'payMonth' },
      { title: '固定年薪拆分', source: 'detail', key: 'annual_salary_monthly' },
      { title: '经营绩效奖金', source: 'detail', key: 'operation_bonus' },
      { title: '股权激励', source: 'detail', key: 'equity_incentive' },
      { title: '特殊补贴', source: 'detail', key: 'special_allowance' },
      { title: '个税', source: 'detail', key: 'personal_income_tax' },
      { title: '实发工资', source: 'header', key: 'realPay' },
    ],
  },
];

export const salarySlipSqlSnippet = `-- 1. 工资条主表增加发放月份、职级与模板字段
ALTER TABLE Bil_Salary_Slip ADD COLUMN pay_month varchar(7) NULL COMMENT '工资发放月份，格式 YYYY-MM';
ALTER TABLE Bil_Salary_Slip ADD COLUMN employee_id varchar(50) NULL COMMENT '员工ID';
ALTER TABLE Bil_Salary_Slip ADD COLUMN employee_code varchar(64) NULL COMMENT '员工工号';
ALTER TABLE Bil_Salary_Slip ADD COLUMN job_level_code varchar(32) NULL COMMENT '职级编码';
ALTER TABLE Bil_Salary_Slip ADD COLUMN job_level_name varchar(64) NULL COMMENT '职级名称';
ALTER TABLE Bil_Salary_Slip ADD COLUMN job_series varchar(16) NULL COMMENT '职级序列';
ALTER TABLE Bil_Salary_Slip ADD COLUMN job_series_name varchar(32) NULL COMMENT '职级序列名称';
ALTER TABLE Bil_Salary_Slip ADD COLUMN export_template_code varchar(32) NULL COMMENT '导出模板编码';
ALTER TABLE Bil_Salary_Slip ADD COLUMN export_template_name varchar(64) NULL COMMENT '导出模板名称';

-- 2. 职级主数据表
CREATE TABLE Bil_Job_Level (
  rowid varchar(50) NOT NULL,
  level_code varchar(32) NOT NULL,
  level_name varchar(64) NOT NULL,
  level_series varchar(16) NOT NULL,
  level_series_name varchar(32) NOT NULL,
  export_template_code varchar(32) NOT NULL,
  sort_no int NOT NULL DEFAULT 0,
  is_enabled tinyint(1) NOT NULL DEFAULT 1,
  remark varchar(255) NULL,
  PRIMARY KEY (rowid)
);

-- 3. 导出模板主表
CREATE TABLE Bil_Salary_Export_Template (
  rowid varchar(50) NOT NULL,
  template_code varchar(32) NOT NULL,
  template_name varchar(64) NOT NULL,
  template_scope varchar(32) NOT NULL,
  is_default tinyint(1) NOT NULL DEFAULT 0,
  is_enabled tinyint(1) NOT NULL DEFAULT 1,
  remark varchar(255) NULL,
  PRIMARY KEY (rowid)
);

-- 4. 导出模板明细表
CREATE TABLE Bil_Salary_Export_Template_Item (
  rowid varchar(50) NOT NULL,
  template_id varchar(50) NOT NULL,
  column_title varchar(64) NOT NULL,
  source_type varchar(16) NOT NULL,
  source_key varchar(64) NOT NULL,
  item_code varchar(64) NULL,
  sort_no int NOT NULL DEFAULT 0,
  is_enabled tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (rowid)
);`;
