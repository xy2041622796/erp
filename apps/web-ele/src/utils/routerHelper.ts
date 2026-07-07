import type {
  RouteLocationNormalized,
  RouteRecordNormalized,
} from 'vue-router';

import { defineAsyncComponent } from 'vue';

const modules = import.meta.glob('../views/**/*.{vue,tsx}');

const componentPathAliases: Record<string, string> = {
  '/hr/organization/orgChart': '/hr/organ/org-chart',
  '/hr/organization/orgchart': '/hr/organ/org-chart',
  '/hr/organization/usermanagement': '/hr/organ/user-management',
  '/hr/organization/userManagement': '/hr/organ/user-management',
  '/hr/organization/jobManage': '/hr/organ/job-manage',
  '/hr/organization/jobmanage': '/hr/organ/job-manage',
};
/**
 * 注册一个异步组件
 * @param componentPath 例:/bpm/oa/leave/detail
 */
export function registerComponent(componentPath: string) {
  const rawPath = componentPath.startsWith('/')
    ? componentPath
    : '/' + componentPath;
  const cleanPath = rawPath.split('?')[0]!.split('#')[0]!;
  const normalizedPath = componentPathAliases[cleanPath] || componentPathAliases[cleanPath.toLowerCase()] || cleanPath;

  const exactCandidates = [
    `../views${normalizedPath}/index.vue`,
    `../views${normalizedPath}.vue`,
    `../views${normalizedPath}/index.tsx`,
    `../views${normalizedPath}.tsx`,
  ];

  const exactMatched = exactCandidates.find((item) =>
    Object.keys(modules).some(
      (key) => key.toLowerCase() === item.toLowerCase(),
    ),
  );
  if (exactMatched) {
    const matchKey = Object.keys(modules).find(
      (key) => key.toLowerCase() === exactMatched.toLowerCase(),
    );
    if (matchKey) {
      return defineAsyncComponent(modules[matchKey] as any);
    }
  }

  const fuzzyMatched = Object.keys(modules).find(
    (item) =>
      item.toLowerCase().includes(normalizedPath.toLowerCase()) &&
      !item.includes('/modules/'),
  );
  if (fuzzyMatched) {
    return defineAsyncComponent(modules[fuzzyMatched] as any);
  }
}

export const getRawRoute = (
  route: RouteLocationNormalized,
): RouteLocationNormalized => {
  if (!route) return route;
  const { matched, ...opt } = route;
  return {
    ...opt,
    matched: (matched
      ? matched.map((item) => ({
          meta: item.meta,
          name: item.name,
          path: item.path,
        }))
      : undefined) as RouteRecordNormalized[],
  };
};
