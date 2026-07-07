// src/components/VxeTable/extend/ApiCellDict.tsx
import { defineComponent, ref, onMounted, watch } from 'vue';
import { VxeCellProps } from 'vxe-table';

type DictItem = {
  label: string;
  value: string | number;
  [key: string]: any;
};

export default defineComponent({
  name: 'ApiCellDict',
  props: {
    cellValue: [String, Number],
    row: Object,
    column: Object,
    dictApi: {
      type: Function,
      required: true,
    },
    dictLabel: {
      type: String,
      default: 'label',
    },
    dictValue: {
      type: String,
      default: 'value',
    },
    nullFormat: {
      type: String,
      default: '-',
    },
    cache: {
      type: Boolean,
      default: true,
    },
  },
  setup(props: VxeCellProps & any) {
    const dictData = ref<DictItem[]>([]);
    const cacheMap = new Map<string, DictItem[]>();

    const getDictData = async () => {
      const { dictApi, cache } = props;
      const cacheKey = dictApi.toString();
      if (cache && cacheMap.has(cacheKey)) {
        dictData.value = cacheMap.get(cacheKey)!;
        return;
      }
      try {
        const res = await dictApi();
        dictData.value = res || [];
        cache && cacheMap.set(cacheKey, dictData.value);
      } catch (e) {
        dictData.value = [];
      }
    };

    onMounted(() => {
      getDictData();
    });

    watch([() => props.dictApi], () => {
      getDictData();
    }, { deep: true });

    const getLabel = () => {
      const { cellValue, dictLabel, dictValue, nullFormat } = props;
      if (cellValue === null || cellValue === undefined || cellValue === '') {
        return nullFormat;
      }
      const item = dictData.value.find((item) => item[dictValue] === cellValue);
      return item ? item[dictLabel] : nullFormat;
    };

    return () => <span>{getLabel()}</span>;
  },
});
