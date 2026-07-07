import type { Ref } from 'vue';

import { computed, ref, unref, watch } from 'vue';

/**
 * Paginates an array of items
 * @param list The array to paginate
 * @param pageNo The current page number (1-based)
 * @param page Number of items per page
 * @returns Paginated array slice
 * @throws {Error} If pageNo or page are invalid
 */
function pagination<T = any>(list: T[], pageNo: number, page: number): T[] {
  if (pageNo < 1) throw new Error('Page number must be positive');
  if (page < 1) throw new Error('Page size must be positive');

  const offset = (pageNo - 1) * Number(page);
  const ret =
    offset + page >= list.length
      ? list.slice(offset)
      : list.slice(offset, offset + page);
  return ret;
}

export function usePagination<T = any>(
  list: Ref<T[]>,
  page: number,
  totalChangeToFirstPage = true,
) {
  const currentPage = ref(1);
  const pageSizeRef = ref(page);

  const totalPages = computed(() =>
    Math.ceil(unref(list).length / unref(pageSizeRef)),
  );

  const paginationList = computed(() => {
    return pagination(unref(list), unref(currentPage), unref(pageSizeRef));
  });

  const total = computed(() => {
    return unref(list).length;
  });

  if (totalChangeToFirstPage) {
    watch(total, () => {
      setCurrentPage(1);
    });
  }

  function setCurrentPage(page: number) {
    if (page === 1 && unref(totalPages) === 0) {
      currentPage.value = 1;
    } else {
      if (page < 1 || page > unref(totalPages)) {
        throw new Error('Invalid page number');
      }
      currentPage.value = page;
    }
  }

  function setPageSize(page: number) {
    if (page < 1) {
      throw new Error('Page size must be positive');
    }
    pageSizeRef.value = page;
    // Reset to first page to prevent invalid state
    currentPage.value = 1;
  }

  return { setCurrentPage, total, setPageSize, paginationList, currentPage };
}
