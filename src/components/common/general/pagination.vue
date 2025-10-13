<template>
    <div class="private-pagination">
        <PaginationRoot :total="props.total" :sibling-count="1" show-edges :default-page="1"
            :items-per-page="props.size">
            <PaginationList v-slot="{ items }" class="PaginationList">
                <PaginationFirst class="Button">
                    <PageLefts style="width: 15px;color: black;"></PageLefts>
                </PaginationFirst>
                <PaginationPrev :style="{ marginRight: 16 }" class="Button">
                    <PageLeft style="width: 15px;color: black;"></PageLeft>
                </PaginationPrev>
                <template v-for="(page, index) in items">
                    <PaginationListItem v-if="page.type === 'page'" :key="index" class="Button" :value="page.value">
                        {{ page.value }}
                    </PaginationListItem>
                    <PaginationEllipsis v-else :key="page.type" :index="index" class="PaginationEllipsis">
                        &#8230;
                    </PaginationEllipsis>
                </template>
                <PaginationNext :style="{ marginLeft: 16 }" class="Button">
                    <PageRight style="width: 15px;color: black;"></PageRight>
                </PaginationNext>
                <PaginationLast class="Button">
                    <PageRights style="width: 15px;color: black;"></PageRights>
                </PaginationLast>
            </PaginationList>
        </PaginationRoot>
    </div>
</template>


<script setup lang="ts">
import { PaginationEllipsis, PaginationFirst, PaginationLast, PaginationList, PaginationListItem, PaginationNext, PaginationPrev, PaginationRoot } from 'reka-ui'
import PageLeft from '@/assets/svg/common/new_icon/chevron-left.vue'
import PageRight from '@/assets/svg/common/new_icon/chevron-right.vue'
import PageLefts from '@/assets/svg/common/new_icon/chevrons-left.vue'
import PageRights from '@/assets/svg/common/new_icon/chevrons-right.vue'

const props: any = defineProps({
    total: {
        default: 1,
        type: Number
    },
    size: {
        default: 10,
        type: Number
    }
})


</script>


<style lang="scss" scope>
.private-pagination {
    button {
        all: unset;
    }

    .Button {
        text-align: center;
        font-size: 15px;
        line-height: 1;
        align-items: center;
        justify-content: center;
        height: 2.25rem;
        width: 2.25rem;
        border-radius: 0.25rem;
        transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
    }

    .Button:disabled {
        opacity: .5
    }

    .Button:hover {
        background-color: rgba(0, 0, 0, 0.1)
    }

    .Button[data-selected] {
        background-color: rgb(0, 0, 0);
        color: white
    }

    .PaginationEllipsis {
        display: flex;
        height: 2.25rem;
        width: 2.25rem;
        align-items: center;
        justify-content: center
    }

    .PaginationList {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        color: rgb(0, 0, 0)
    }
}
</style>