<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { Delete, EditPen, Plus, Upload } from '@element-plus/icons-vue';
import { deleteOrganAttendance, getOrganAttendanceList, getOrganDictMap, saveOrganAttendance, type OrganAttendance } from '#/api/erp/human-resources/organ';

import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElPagination,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';
interface DictOption { label: string; value: string }

 const userStore=useUserStore(); const loading=ref(false); const saving=ref(false); const rows=ref<OrganAttendance[]>([]); const currentPage=ref(1); const page=ref(20); const dialogVisible=ref(false); const dialogMode=ref<'add'|'edit'>('add'); const form=ref<Partial<OrganAttendance>>({});
const leaveTypeOptions=ref<DictOption[]>([{label:'事假',value:'事假'},{label:'病假',value:'病假'},{label:'年假',value:'年假'}]); const statusOptions=ref<DictOption[]>([{label:'待提交',value:'0'},{label:'审批中',value:'1'},{label:'已完成',value:'2'}]);
const noonMinute=12*60; const defaultLeaveTime=[new Date(2000,1,1,9,0,0),new Date(2000,1,1,18,0,0)];
const currentUserName=computed(()=>text(userStore.userInfo?.nickname||userStore.userInfo?.username||userStore.userInfo?.realName||userStore.userInfo?.userName||userStore.userInfo?.name));
const currentUserId=computed(()=>text(userStore.userInfo?.userId||userStore.userInfo?.id||userStore.userInfo?.userid||userStore.userInfo?.UserID));
function text(v:unknown){return String(v??'').trim()} function keyOf(r:any){return text(r.rowid||r.ROWID||r.ApplicantName||r.ApplyTime)}
function toDate(v:unknown){const s=text(v); if(!s) return null; const d=new Date(`${s}T00:00:00`); return Number.isNaN(d.getTime())?null:d}
function toMinute(v:unknown){const s=text(v); const m=s.match(/^(\d{1,2}):(\d{1,2})/); if(!m) return null; return Number(m[1])*60+Number(m[2])}
function formatDate(d:Date){const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`}
function splitDateTime(v:string){const [date,time=''] = text(v).split(' '); return {date,time:time.slice(0,5)}}
function parseLeaveDays(v:unknown){const n=Number(v); return Number.isFinite(n)&&n>0?Math.round(n*2)/2:0}
function diffDaysInclusive(begin:Date,end:Date){const a=new Date(begin.getFullYear(),begin.getMonth(),begin.getDate()).getTime(); const b=new Date(end.getFullYear(),end.getMonth(),end.getDate()).getTime(); return Math.floor((b-a)/86400000)+1}
function beginDayCount(minute:number|null){return minute!==null&&minute>=noonMinute?0.5:1}
function endDayCount(minute:number|null){return minute!==null&&minute<=noonMinute?0.5:1}
function sameDayCount(beginMinute:number|null,endMinute:number|null){if(beginMinute!==null&&endMinute!==null&&endMinute<=beginMinute) return 0; if(beginMinute!==null&&endMinute!==null&&((beginMinute<noonMinute&&endMinute<=noonMinute)||(beginMinute>=noonMinute&&endMinute>noonMinute))) return 0.5; return 1}
function fillCurrentApplicant(){form.value.ApplicantName=currentUserName.value; if(currentUserId.value) form.value.Applicant=currentUserId.value}
function inferEndDateByDays(){const begin=toDate(form.value.BeginDate); const days=parseLeaveDays(form.value.LeaveDays); if(!begin||!days) return; const end=new Date(begin); end.setDate(begin.getDate()+Math.ceil(days)-1); form.value.EndDate=formatDate(end); form.value.LeaveDays=days as any}
function inferLeaveDaysByDateTime(){const begin=toDate(form.value.BeginDate); const end=toDate(form.value.EndDate); if(!begin||!end) return; const wholeDays=diffDaysInclusive(begin,end); if(wholeDays<=0){ElMessage.warning('结束时间不能早于开始时间'); form.value.EndDate=''; return;} const beginMinute=toMinute((form.value as any).BeginTime); const endMinute=toMinute((form.value as any).EndTime); let days=0; if(wholeDays===1){days=sameDayCount(beginMinute,endMinute); if(!days){ElMessage.warning('结束时间必须晚于开始时间'); (form.value as any).EndTime=''; return;}}else{days=beginDayCount(beginMinute)+Math.max(0,wholeDays-2)+endDayCount(endMinute);} form.value.LeaveDays=Math.max(0.5,days) as any}
const leaveDateTimeRange=computed<string[]>({get(){const bDate=text(form.value.BeginDate); const bTime=text((form.value as any).BeginTime)||'09:00'; const eDate=text(form.value.EndDate); const eTime=text((form.value as any).EndTime)||'18:00'; return bDate&&eDate?[`${bDate} ${bTime}`,`${eDate} ${eTime}`]:[]},set(v){const [begin,end]=Array.isArray(v)?v:[]; if(begin){const b=splitDateTime(begin); form.value.BeginDate=b.date; (form.value as any).BeginTime=b.time||'09:00'} if(end){const e=splitDateTime(end); form.value.EndDate=e.date; (form.value as any).EndTime=e.time||'18:00'} inferLeaveDaysByDateTime()}});
const filtered=computed(()=>rows.value); const paged=computed(()=>filtered.value.slice((currentPage.value-1)*page.value,currentPage.value*page.value));
async function loadDicts(){const d=await getOrganDictMap(); if(d.leaveType.length) leaveTypeOptions.value=d.leaveType; if(d.processStatus.length) statusOptions.value=d.processStatus;}
async function loadData(){loading.value=true; try{try{ const res=await getOrganAttendanceList(); rows.value=res.list;}catch{ rows.value=[]; }}finally{loading.value=false;}}
function openAdd(){dialogMode.value='add';form.value={Applicant:currentUserId.value,ApplicantName:currentUserName.value,LeaveType:leaveTypeOptions.value[0]?.value,BeginTime:'09:00',EndTime:'18:00',ProcessStatus:statusOptions.value[0]?.value};dialogVisible.value=true} function openEdit(row:OrganAttendance){dialogMode.value='edit';form.value={BeginTime:'09:00',EndTime:'18:00',...row};fillCurrentApplicant();dialogVisible.value=true}
async function submit(){saving.value=true; try{fillCurrentApplicant(); if(form.value.BeginDate&&form.value.EndDate) inferLeaveDaysByDateTime(); else inferEndDateByDays(); await saveOrganAttendance(form.value,dialogMode.value); ElMessage.success('保存成功'); dialogVisible.value=false; await loadData();}finally{saving.value=false;}}
async function remove(row:OrganAttendance){await deleteOrganAttendance(row); ElMessage.success('删除成功'); await loadData();}
onMounted(async()=>{await loadDicts(); await loadData();});
</script>
<template><Page auto-content-height class="hr-page"><div class="attendance-page"><div class="toolbar"><span>考勤管理</span><div><ElButton :icon="Plus" type="primary" @click="openAdd">新建</ElButton><ElButton :icon="EditPen" type="primary" :disabled="!paged.length" @click="openEdit(paged[0])">编辑</ElButton><ElButton :icon="Delete" type="primary" :disabled="!paged.length" @click="remove(paged[0])">删除</ElButton><ElButton :icon="Upload" type="primary">提交</ElButton></div></div><ElTable v-loading="loading" border :data="paged" height="560" :row-key="keyOf" size="small" empty-text="无记录可显示"><ElTableColumn label="申请人" width="200"><template #default="{ row = {}} = {}">{{row.ApplicantName||row.Applicant}}</template></ElTableColumn><ElTableColumn label="申请时间" width="220"><template #default="{ row = {}} = {}">{{row.ApplyTime}}</template></ElTableColumn><ElTableColumn label="请假类型" width="180"><template #default="{ row = {}} = {}">{{row.LeaveType}}</template></ElTableColumn><ElTableColumn label="开始日期" width="180"><template #default="{ row = {}} = {}">{{row.BeginDate}}</template></ElTableColumn><ElTableColumn label="开始时间" width="140"><template #default="{ row = {}} = {}">{{row.BeginTime}}</template></ElTableColumn><ElTableColumn label="结束日期" width="180"><template #default="{ row = {}} = {}">{{row.EndDate}}</template></ElTableColumn><ElTableColumn label="结束时间" width="140"><template #default="{ row = {}} = {}">{{row.EndTime}}</template></ElTableColumn><ElTableColumn label="请假天数" width="160"><template #default="{ row = {}} = {}">{{row.LeaveDays}}</template></ElTableColumn><ElTableColumn label="请假原因" min-width="280"><template #default="{ row = {}} = {}">{{row.Reason}}</template></ElTableColumn><ElTableColumn label="流程状态" width="180"><template #default="{ row = {}} = {}">{{row.ProcessStatus}}</template></ElTableColumn></ElTable><div class="pager"><ElPagination v-model:current-page="currentPage" v-model:page-size="page" background layout="prev, pager, next" :total="filtered.length" /><span>{{filtered.length?'1页中的1页':'0页中的0页'}}（{{filtered.length}}项）</span></div></div><ElDialog v-model="dialogVisible" :title="dialogMode==='add'?'考勤申请新增':'考勤申请编辑'" width="760px"><ElForm :model="form" label-width="100px"><ElFormItem label="申请人"><ElInput v-model="form.ApplicantName" disabled /></ElFormItem><ElFormItem label="请假类型"><ElSelect v-model="form.LeaveType" class="w-full"><ElOption v-for="item in leaveTypeOptions" :key="item.value" :label="item.label" :value="item.value" /></ElSelect></ElFormItem><ElFormItem label="请假时间"><ElDatePicker v-model="leaveDateTimeRange" class="w-full" type="datetimerange" range-separator="至" start-placeholder="开始日期时间" end-placeholder="结束日期时间" format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm" :default-time="defaultLeaveTime" @change="inferLeaveDaysByDateTime" /></ElFormItem><ElFormItem label="请假天数"><ElInputNumber v-model="form.LeaveDays" :min="0.5" :step="0.5" :precision="1" controls-position="right" @change="inferEndDateByDays" /></ElFormItem><ElFormItem label="请假原因"><ElInput v-model="form.Reason" :rows="4" type="textarea" /></ElFormItem><ElFormItem label="流程状态"><ElSelect v-model="form.ProcessStatus" class="w-full"><ElOption v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" /></ElSelect></ElFormItem></ElForm><template #footer><ElButton @click="dialogVisible=false">取消</ElButton><ElButton :loading="saving" type="primary" @click="submit">保存</ElButton></template></ElDialog></Page></template>
<style scoped>.hr-page :deep(.page-content){padding:0}.attendance-page{background:#fff}.toolbar{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;border-bottom:1px solid #e5e7eb}.toolbar div{display:flex;gap:8px}.pager{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;color:#909399;font-size:12px}</style>
