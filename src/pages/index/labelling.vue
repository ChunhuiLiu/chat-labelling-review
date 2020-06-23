<template>
  <div style="overflow:auto;padding:10px 30px" :style="{height}">
    <Form
      :model="formItem"
      :label-width="100"
      @submit.native.prevent
      :rules="rules"
      ref="form"
    >
      <FormItem v-if="role==='sys'" label="State" prop="state">
        <createSelect
          v-model="formItem.state"
          :canCreate="canCreateState"
          @on-change="stateChanged"
          :disabled="false"
        />
      </FormItem>
      <FormItem v-if="role==='sys'" label="Action" prop="action">
        <customCascader
          @on-visible-change="cascaderVisableChange"
          :data="actions.system"
          v-model="formItem.action"
          placeholder="Select"
          @on-change="actionChanged"
          @showTooltip="showTooltip"
        ></customCascader>
      </FormItem>
      <FormItem v-if="role==='cus'" label="Intent" prop="action">
        <customCascader
          :data="actions.user"
          v-model="formItem.action"
          placeholder="Select"
          @on-change="actionChanged"
          @showTooltip="showTooltip"
        ></customCascader>
      </FormItem>
      <FormItem v-if="role==='sys'" label="Selected Query/Results" prop="selectedSearch">
        <draggableList v-model="formItem.selectedSearch" />
      </FormItem>
      <FormItem label="Response" prop="response">
        <Input v-model="formItem.response" @on-blur="responseChanged" type="textarea" :rows="4" />
      </FormItem>
      <FormItem style="margin-bottom:0px">
<!--        <Button type="default" @click="submit">Submit</Button>-->
        <Checkbox v-model="formItem.sendAnother" style="margin-left:20px">Send another message</Checkbox>
<!--        <br />-->
<!--        <a @click="finishConversation" v-if="role==='cus'">Finish the conversation>></a>-->
      </FormItem>
    </Form>
  </div>
</template>
<script>
import customCascader from '../../components/customCascader'
import helpTooltip from '../../components/helpTooltip'
import draggableList from '../../components/draggableList'
import createSelect from '../../components/createSelect'

const calAllow = (arr, actionNames, actionNameIndex) => {
  if (!actionNames[actionNameIndex]) return false
  let a = arr.filter(value => {
    return actionNames[actionNameIndex] === value.name
  })
  if (!a[0]) return false
  if (a[0].children) {
    return calAllow(a[0].children, actionNames, actionNameIndex + 1)
  } else { return a[0] && a[0].allowEmptySearch === true }
}

export default {
  components: {
    helpTooltip,
    draggableList,
    customCascader,
    createSelect
  },
  props: {
    conversationId: {
    },
    height: {
      type: String
    },
    role: {
      type: String
    },
    finish: {
      type: Function // 用户角色自主结束会话的方法
    },
    actions: {}, // 全部action
    // currentState: {}, // 上一轮过后，state是什么（数据库里的state，系统用户没进行修改）
    searchData: {}, // 调用api后搜索结果，每次state改变都会重新搜索
    message: {}
  },
  watch: {
    message (newValue, oldValue) {
      this.formItem.state = [...newValue.state]
      this.stateChanged(newValue.state, true)
      this.formItem.action = [...newValue.action]
      this.formItem.selectedSearch = [...newValue.selectedSearch]
      this.formItem.response = newValue.response
      this.formItem.sendAnother = newValue.sendAnother
    }
  },
  data () {
    return {
      formItem: {
        selectedSearch: [],
        state: [],
        action: [],
        response: this.message.response,
        sendAnother: false
      },
      rules: {
        state: [{
          required: true,
          validator: (rule, value, callback) => {
            if (this.formItem.action && !calAllow(this.actions.system, this.formItem.action, 0) && (!value || value.length === 0)) {
              return callback(new Error('Please select state!'))
            } else callback()
          },
          trigger: 'blur'
        }],
        action: [{
          required: true,
          validator: (rule, value, callback) => {
            if (!value || value.length === 0) {
              return callback(new Error('Please select action!'))
            } else callback()
          },
          trigger: 'blur'
        }],
        response: [{
          required: true,
          type: 'string',
          message: 'Please fill in response!',
          trigger: 'blur'
        }],
        selectedSearch: [{
          validator: (rule, value, callback) => {
            let active = this.$refs.searchPanel.active
            if (this.formItem.action && !calAllow(this.actions.system, this.formItem.action, 0) && active && active.length > 0 && (!value || value.length === 0)) {
              return callback(new Error('Please select search results!'))
            } else { callback() }
          },
          trigger: 'blur'
        }]
      },
      drawer: false,
      sendLog: true,
      searchPanelLoading: false,
      searchResults: {},
      actionBackup: [], // 上一次sys action改变后的值
      submitting: false // 为了避免在发送数据时，用户进行别的操作
    }
  },
  methods: {
    reset () {
      this.sendLog = false // 重置界面期间数据的改变不发log
      this.formItem = {
        selectedSearch: [],
        state: [],
        action: [],
        response: '',
        sendAnother: false
      }
      this.drawer = false
      this.searchPanelLoading = false
      this.searchResults = {}
      this.actionBackup = []
      this.$nextTick(() => {
        this.sendLog = true
      })
    },
    cascaderVisableChange (show) {
      if (show) { this.drawer = true }
    },
    stateChanged (states, force) {
      if ((this.submitting) && !force) return
      this.searchPanelLoading = true
      this.searchResults = {}
      // this.searchData(states || [], (data) => {
      //   this.searchPanelLoading = false
      //   this.searchResults = {...data}
      // })
      // 清空action和selectedSearch
      let originSendlog = this.sendLog
      this.sendLog = false
      this.formItem.selectedSearch = []
      this.formItem.action = []
      this.$nextTick(() => {
        this.sendLog = originSendlog
      })
      // 强制刷新一定不来自用户动作，所以不发log
      if (this.sendLog && !this.sendDisabled && this.conversationId && !force) {
        this.$log({
          conversationId: this.conversationId,
          type: 'stateChanged',
          data: {states}
        })
      }
    },
    actionChanged (actions) {
      // 如果是系统角色，改了相应action，对应要清空之前选择的search result
      if (this.role === 'sys' && this.formItem.selectedSearch.length > 0) {
        // actionBackup中存的是上一次sys action改变后的值
      // 比较与当前action的第一级是否相同，如果相同，则selectedSearch不做修改，否则会清空已选result
        if (this.actionBackup[0] !== actions[0]) {
          this.formItem.selectedSearch = []
        }
        this.actionBackup = [...actions]
      }
      if (this.sendLog && !this.sendDisabled && this.conversationId) {
        this.$log({
          conversationId: this.conversationId,
          type: 'actionChanged',
          data: {actions}
        })
      }
    },
    responseChanged () {
      if (this.sendLog && !this.sendDisabled && this.conversationId && this.formItem.response) {
        this.$log({
          conversationId: this.conversationId,
          type: 'responseChanged',
          data: {response: this.formItem.response}
        })
      }
    },
    showTooltip (item) {
      if (!this.sendDisabled && this.sendLog && this.conversationId) {
        this.$log({
          conversationId: this.conversationId,

          type: 'showTooltip',
          data: {item: {...item}}
        })
      }
    },
    canCreateState (value) {
      if (value.split(' ').length >= 5) {
        return {
          canCreate: false,
          message: 'Too many words!'
        }
      }
      return {
        canCreate: true
      }
    },
    getUpdated () {
      let temp = { ...this.message }
      temp.state = [...this.formItem.state]
      temp.action = [...this.formItem.action]
      temp.selectedSearch = [...this.formItem.selectedSearch]
      temp.response = this.formItem.response
      temp.sendAnother = this.formItem.sendAnother
      return temp
    }
  }
}
</script>
