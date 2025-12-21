<template>
    <div class="date-container">
        <CalendarRoot 
            v-slot="{ weekDays, grid }" 
            v-model="selectedDate" 
            :is-date-unavailable="isDateUnavailable"
            :disabled="!enable"
            class="Calendar" 
            fixed-weeks
        >

            <CalendarHeader class="CalendarHeader">
                <CalendarPrev class="CalendarNavButton">
                    <Icon icon="radix-icons:chevron-left" class="Icon" />
                </CalendarPrev>
                <CalendarHeading class="CalendarHeading" />
                <CalendarNext class="CalendarNavButton">
                    <Icon icon="radix-icons:chevron-right" class="Icon" />
                </CalendarNext>
            </CalendarHeader>

            <div class="CalendarWrapper">
                <CalendarGrid v-for="month in grid" :key="month.value.toString()" class="CalendarGrid">
                    <CalendarGridHead>
                        <CalendarGridRow class="CalendarGridRow HeadRow">
                            <CalendarHeadCell v-for="day in weekDays" :key="day" class="CalendarHeadCell">
                                {{ day }}
                            </CalendarHeadCell>
                        </CalendarGridRow>
                    </CalendarGridHead>
                    <CalendarGridBody class="CalendarGridBody">
                        <CalendarGridRow v-for="(weekDates, index) in month.rows" :key="`weekDate-${index}`"
                            class="CalendarGridRow">
                            <CalendarCell v-for="weekDate in weekDates" :key="weekDate.toString()" :date="weekDate"
                                class="CalendarCell">
                                <CalendarCellTrigger :day="weekDate" :month="month.value" class="CalendarCellTrigger" />
                            </CalendarCell>
                        </CalendarGridRow>
                    </CalendarGridBody>
                </CalendarGrid>
            </div>
        </CalendarRoot>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import {
    CalendarCell,
    CalendarCellTrigger,
    CalendarGrid,
    CalendarGridBody,
    CalendarGridHead,
    CalendarGridRow,
    CalendarHeadCell,
    CalendarHeader,
    CalendarHeading,
    CalendarNext,
    CalendarPrev,
    CalendarRoot,
    type CalendarRootProps
} from 'reka-ui'
import { getLocalTimeZone, today, type DateValue } from '@internationalized/date'

// 修改点 2: 定义 Props，增加 enable
const props = defineProps({
    enable: { default: true, type: Boolean } // 控制是否可点击
})

// 修改点 3: 定义 Emits，用于向父组件发送时间戳
const emits = defineEmits(['date-change'])

const selectedDate = ref<DateValue>()

// 修改点 4: 不允许选择今天之前的日期 (你原有的逻辑是正确的，我保留并确认了它)
const isDateUnavailable: CalendarRootProps['isDateUnavailable'] = (date) => {
    const now = today(getLocalTimeZone())
    // date.compare(now) < 0 表示日期早于今天
    return date.compare(now) < 0
}

// 辅助函数：将 DateValue 转换为 0点时间戳
const emitDateTimestamp = (dateVal: DateValue | undefined) => {
    if (!dateVal) return
    
    // 使用 getLocalTimeZone() 将 CalendarDate 转换为当前时区的 JS Date 对象
    const jsDate = dateVal.toDate(getLocalTimeZone())
    
    // 确保是 00:00:00
    jsDate.setHours(0, 0, 0, 0)
    
    // 发送时间戳
    emits('date-change', jsDate.getTime())
}

// 修改点 5: 监听选择变化，一旦变化就转换并发射事件
watch(selectedDate, (newVal) => {
    emitDateTimestamp(newVal)
})

// 修改点 6: 初始化逻辑
onMounted(() => {
    // 获取今天
    const now = today(getLocalTimeZone())
    // 默认选中今天
    selectedDate.value = now
    // 立即触发一次事件给父组件
    // 注意：由于上面有 watch，给 value 赋值会触发 watch，
    // 但为了保险起见或明确逻辑，这里也可以手动调一下，通常赋值触发 watch 即可。
    // 如果担心 watch 还没生效，可以直接调用：
    // emitDateTimestamp(now) 
})

</script>

<style lang="scss" scoped>
/* 样式保持不变，原封不动 */
.date-container {
    $primary-color: #000000;
    $primary-light: #e0e7ff; 
    $text-main: #1f2937;
    $text-muted: #8c8c8c;
    $bg-white: #ffffff;
    $radius: 12px;

    max-width: 400px;

    .task-edit-item {
        margin-bottom: 1.5rem;
    }

    .Calendar {
        margin-top: 1rem;
        background-color: $bg-white;
        border-radius: $radius;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        border: 1px solid #f3f4f6;
        padding: 1.5rem;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        
        // 增加禁用状态的样式支持 (CalendarRoot disabled 会给根元素加上 data-disabled)
        &[data-disabled] {
            opacity: 0.5;
            pointer-events: none;
            filter: grayscale(100%);
        }
    }

    /* 以下样式同你原来的一致，省略... */
    .CalendarHeader {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .CalendarNavButton {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        width: 2rem;
        height: 2rem;
        color: $text-main;
        background-color: transparent;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.2s ease;
        border: 1px solid transparent;

        &:hover {
            background-color: #f3f4f6;
            color: $primary-color;
        }

        &:active {
            transform: scale(0.95);
        }

        .Icon {
            width: 1.2rem;
            height: 1.2rem;
        }
    }

    .CalendarHeading {
        font-weight: 600;
        font-size: 1rem;
        color: $text-main;
    }

    .CalendarWrapper {
        display: flex;
        flex-direction: column;
    }

    .CalendarGrid {
        width: 100%;
        border-collapse: collapse;
    }

    .CalendarGridRow {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.25rem;
    }

    .CalendarHeadCell {
        width: 2.5rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        color: $text-muted;
        font-weight: 500;
        text-transform: uppercase;
    }

    .CalendarCell {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .CalendarCellTrigger {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        font-size: 0.875rem;
        line-height: 1;
        font-weight: 500;
        color: $text-main;
        background-color: transparent;
        border-radius: 50%;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

        &:hover:not([data-disabled]):not([data-unavailable]) {
            background-color: $primary-light;
            color: $primary-color;
        }

        &[data-selected] {
            background-color: $primary-color;
            color: #ffffff;
            font-weight: 600;
            box-shadow: 0 4px 6px -1px rgba($primary-color, 0.4);
        }

        &[data-today]:not([data-selected]) {
            color: $primary-color;
            font-weight: 700;
            background-color: #f9fafb;
            // border: 1px solid $primary-light;

            &::after {
                content: '';
                position: absolute;
                bottom: 4px;
                left: 50%;
                transform: translateX(-50%);
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background-color: $primary-color;
            }
        }

        &[data-unavailable] {
            color: #d1d5db;
            text-decoration: line-through;
            cursor: not-allowed;
            background-color: transparent;

            &:hover {
                background-color: transparent;
                color: #d1d5db;
            }
        }

        &[data-outside-view] {
            color: #d1d5db;
            opacity: 0.5;
        }
    }
}
</style>