# HumanResources Sprint 3 交付说明

## 范围

- HR-TRAIN-01 培训课程
- HR-TRAIN-02 培训评估
- HR-TRAIN-03 学习路径
- HR-TRAIN-04 学习路径差距分析
- HR-TRAIN-05 学习路径能力模型
- HR-TRAIN-06 学习路径路线图
- HR-TRAIN-07 学习路径计划

## 页面交付

- `src/views/erp/HumanResources/training/course/index.vue`
- `src/views/erp/HumanResources/training/evaluation/index.vue`
- `src/views/erp/HumanResources/training/learning-path/index.vue`
- `src/views/erp/HumanResources/training/learning-path/competency/index.vue`
- `src/views/erp/HumanResources/training/learning-path/gap-analysis/index.vue`
- `src/views/erp/HumanResources/training/learning-path/plan/index.vue`
- `src/views/erp/HumanResources/training/learning-path/roadmap/index.vue`

## 交付说明

- 培训课程：课程列表 + 课程摘要 + 相关评估联查。
- 培训评估：评估列表 + 课程关联信息 + 详情抽屉。
- 学习路径：四类训练数据总览入口。
- 能力模型：能力项、对象映射、说明查看。
- 差距分析：对象、能力项、结论、重点差距统计。
- 学习计划：计划对象、阶段、状态与详情查看。
- 路线图：按路线图分组展示阶段节点与说明。

## 数据来源

- `Bil_HR_Training_Course`
- `Bil_HR_Training_Evaluation`
- `Bil_HR_Training_Competency`
- `Bil_HR_Training_Gap_Analysis`
- `Bil_HR_Training_Plan`
- `Bil_HR_Training_Roadmap`

## 备注

- Sprint3 目标是完成 training 模块剩余占位页替换。
- 当前以正式页面形态承接迁移数据，后续可再补业务编辑动作和专属图表。
