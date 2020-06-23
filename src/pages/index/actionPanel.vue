<template>
  <Form ref="formValidate" :model="formValidate" >
    <FormItem label="语句" prop="name">
      <Input
        v-model="formValidate.text"
        placeholder="在原始消息中选择一部分……"
        type="textarea"
      ></Input>
    </FormItem>
    <FormItem label="下标" prop="index">
      <InputNumber v-model="formValidate.range[0]"></InputNumber>
      <InputNumber v-model="formValidate.range[1]"></InputNumber>
    </FormItem>
    <FormItem prop="intent">
      <div slot="label" style="text-align: left">Intent</div>
      <Select
        v-model="formValidate.intent"
        placeholder="选择intent..."
        @on-change="intentChange"
        placement="top"
      >
        <Option
          v-for="item in labels.intents"
          :value="item.name"
          :label="item.title"
          :key="item.name"
        >
          {{ item.title }}
          <helpTooltip v-if="item.desc" :content="item.desc" />
        </Option>
      </Select>
    </FormItem>
    <FormItem prop="slot">
      <div slot="label" style="text-align: left">Slot</div>
      <Select
        v-model="formValidate.slot"
        placeholder="选择或填写slot..."
        @on-change="slotChange"
        :disabled="!formValidate.intent"
        filterable
        allow-create
        placement="top"
        @on-create="createSlot"
      >
        <Option
          v-for="item in slots"
          :value="item.name"
          :label="item.title"
          :key="item.name"
        >
          {{ item.title }}
          <helpTooltip v-if="item.desc" :content="item.desc" />
        </Option>
      </Select>
    </FormItem>
    <FormItem prop="aspect">
      <div slot="label" style="text-align: left">Aspect</div>
      <AutoComplete
        v-model="formValidate.aspect"
        v-debounce="aspectQueryChange"
        :disabled="!formValidate.intent || !formValidate.slot"
        placeholder="选择或填写aspect..."
      >
        <Option
          v-for="(item, index) in aspects"
          :value="item.name"
          :label="item.title"
          :key="item.name+'--'+index"
        >
          {{ item.title }}
          <ButtonGroup   @click.stop="()=>{}" v-if="needPagination&&index==0&&hasNextPage" style="float:right;z-index:999">
            <Button
              type="primary"
              size="small"
              @click.stop="currentPage--"
              :disabled="currentPage === 0"
            >
              <Icon type="ios-arrow-back"></Icon>
            </Button>
            <Button type="primary" size="small" :disabled="!hasNextPage"
            >
              <Icon
                type="ios-arrow-forward"
                @click.stop="currentPage++"
              ></Icon>
            </Button>
          </ButtonGroup>
          <helpTooltip v-if="item.desc" :content="item.desc" />
        </Option>
      </AutoComplete>
<!--      <Select-->
<!--        v-model="formValidate.aspect"-->
<!--        placeholder="选择或填写aspect..."-->
<!--        :disabled="!formValidate.intent || !formValidate.slot"-->
<!--        filterable-->
<!--        remote-->
<!--        :loading="loadingAspect"-->
<!--        allow-create-->
<!--        @on-create="createAspect"-->
<!--        v-debounce="aspectQueryChange"-->
<!--        placement="top"-->
<!--      >-->
<!--        <Option-->
<!--          v-for="(item, index) in aspects"-->
<!--          :value="item.name"-->
<!--          :label="item.title"-->
<!--          :key="item.name+'&#45;&#45;'+index"-->
<!--        >-->
<!--          {{ item.title }}-->
<!--          <ButtonGroup   @click.stop="()=>{}" v-if="needPagination&&index==0" style="float:right;z-index:999">-->
<!--            <Button-->
<!--              type="primary"-->
<!--              size="small"-->
<!--              @click.stop="currentPage&#45;&#45;"-->
<!--              :disabled="currentPage === 0"-->
<!--            >-->
<!--              <Icon type="ios-arrow-back"></Icon>-->
<!--            </Button>-->
<!--            <Button type="primary" size="small" :disabled="!hasNextPage"-->
<!--&gt;-->
<!--              <Icon-->
<!--                type="ios-arrow-forward"-->
<!--                @click.stop="currentPage++"-->
<!--              ></Icon>-->
<!--            </Button>-->
<!--          </ButtonGroup>-->
<!--          <helpTooltip v-if="item.desc" :content="item.desc" />-->
<!--        </Option>-->
<!--      </Select>-->
    </FormItem>
    <FormItem prop="result">
      <div slot="label" style="text-align: left">Results</div>
      <Input
        v-model="formValidate.result"
        placeholder="填写result..."
      >
      </Input>
    </FormItem>
  </Form>
</template>
<script>
import helpTooltip from '../../components/helpTooltip'
export default {
  model: {
    event: 'change',
    prop: 'value'
  },
  props: ['value'],
  components: {
    helpTooltip
  },
  watch: {
    formValidate: {
      handler (newVal, oldVal) {
        this.$emit('change', newVal)
      },
      deep: true
    },
    value: {
      handler (newVal, oldVal) {
        this.formData(newVal)
      },
      deep: true,
      immediate: true
    },
    currentPage (newVal) {
      this.pageChange(newVal)
    }
  },
  data () {
    return {
      formValidate: {
        text: '',
        range: '',
        intent: '',
        slot: '',
        aspect: '',
        result: ''
      },
      slots: [],
      aspects: [],
      labels: window.labels,
      remote: false,
      loadingAspect: false,
      needPagination: false,
      currentPage: 0,
      pageSize: 10,
      query: '',
      hasNextPage: true
    }
  },
  methods: {
    formData (value) {
      let same = true
      for (let k in value) {
        let v = value[k]
        same = same && this.formValidate[k] === v
      }
      if (same) return
      this.formValidate = {
        text: value.text,
        range: value.range,
        intent: value.intent
      }
      if (this.value.slot) {
        this.intentChange(this.value.intent)
        if (this.slots.filter(v => value.slot === v.name).length === 0) {
          this.createSlot(value.slot)
        }
        this.formValidate.slot = value.slot
      }
      if (this.value.aspect) {
        this.slotChange(this.value.slot)
        if (this.aspects.filter(v => value.aspect === v.name).length === 0) {
          this.createAspect(this.value.aspect)
        }
        this.formValidate.aspect = value.aspect
        this.formValidate.result = value.result
      }
    },
    createSlot (val) {
      this.slots.push({
        name: val,
        title: val
      })
    },
    createAspect (val) {
      this.aspects.push({
        name: val,
        title: val
      })
    },
    intentChange (value) {
      this.formValidate.slot = ''
      this.formValidate.aspect = ''
      this.formValidate.result = ''
      this.slots = []
      this.aspects = []
      this.labels.slots.map(slot => {
        if (slot.activeIntents.indexOf(value) >= 0) {
          this.slots.push(slot)
        }
      })
    },
    slotChange (value) {
      this.formValidate.aspect = ''
      this.aspects = []
      if (this.slots.filter(s => s.name === value && s.loadData).length > 0) {
        // 这里slot变了，但是aspect里不填值，不发动搜索，必须填入关键词，才会填入aspects
      } else {
        this.labels.aspects.map(v => {
          if (v.activeSlots.indexOf(value) >= 0) {
            this.aspects.push(v)
          }
        })
      }
    },
    aspectQueryChange (q) {
      if (!q) return
      if (
        this.slots.filter(s => s.name === this.formValidate.slot && s.loadData)
          .length > 0
      ) {
        // this.loadingAspect = true
        this.searchAspects(q, 0)
        // this.loadingAspect = false
      }
    },
    searchAspects (query, startIndex) {
      let resultIndexes = window[this.formValidate.slot + '_index'].search({
        query,
        limit: this.pageSize,
        page: startIndex + ''
      })
      this.aspects = []
      this.query = query
      this.needPagination = true
      this.currentPage = Math.floor(startIndex / this.pageSize)
      this.hasNextPage = resultIndexes.next !== null
      if (resultIndexes.result) {
        resultIndexes.result.map(v => {
          let data = window[this.formValidate.slot + '_indexData'][v]
          this.aspects.push({
            name: data,
            title: data
          })
        })
      }
    },
    pageChange (pageNumber) {
      this.aspects = []
      this.searchAspects(this.query, pageNumber * this.pageSize)
    }
  }
}
</script>
