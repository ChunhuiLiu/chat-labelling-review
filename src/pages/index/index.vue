<style scoped>
.wrap {
   position: relative;
   overflow: hidden;
   margin-right: 4px;
   margin-left: 20px;
   display: inline-block;
   padding: 4px 10px;
   line-height: 18px;
   text-align: center;
   vertical-align: middle;
   cursor: pointer;
   background: #2d8cf0;
   border: 1px dotted #2d8cf0;
   border-radius: 4px;
   -webkit-border-radius: 4px;
   -moz-border-radius: 4px;
   font-size: 14px;
   font-weight: 100;
 }
.wrap:hover {
  background-color: #57a3f3;
  border-color: #57a3f3;
}
.wrap span {
  color: #fff;
}
.wrap .file {
  position: absolute;
  top: 0;
  right: 0;
  margin: 0;
  border: solid transparent;
  opacity: 0;
  filter: alpha(opacity=0);
  cursor: pointer;
}
</style>
<template>
  <div>
    <Card dis-hover :bordered="false" :padding="8">
      <div slot="title" style="text-align:center">
        <strong>
          当前文件：
          <tag color="blue" type="border" v-if="this.fileName">{{
            fileName
          }}</tag>
          <span v-else>无</span>
        </strong>
        <div class="wrap">
          <span> <Icon type="md-open" />打开已标注文件 </span>
          <input
            id="labelledUpload"
            class="file"
            type="file"
            @change="readLabelled"
            ref="labelledUpload"
          />
        </div>
        <Button type="text" @click="generateFile">
          <Icon type="md-download" />下载已标注文件
        </Button>
      </div>
      <Spin size="large" v-if="loading" fix>
        <Icon type="ios-loading" size="50" class="spin-icon-load"></Icon>
        <div>Loading...</div>
      </Spin>
      <div>
        <Row :gutter="8">
          <Col :span="10">
            <Card
              id="chatPanel"
              style="background:#efefef7a;min-height:400px;overflow:auto"
              :style="{ height: height + 'px', overflow: 'auto' }"
              ref="chatPanel"
            >
              <div
                v-for="(m, index) in messages"
                :key="'message-' + index"
                @click="messageSelected(index)"
                style="border-radius:10px;padding:3px"
                :style="{
                  border:
                    currentIndex === index ? '1px dashed #1890ff ' : 'none'
                }"
              >
                <message :data="m" :id="'message_'+index"/>
              </div>
            </Card>
          </Col>
          <Col :span="14" v-if="messages.length > 0">
            <div
              style="padding:10px;overflow:auto"
              :style="{ height: height - 20 + 'px' }"
            >
              <Page v-if="dialogs.length" :total="dialogs.length" @on-change="dialogChanged" :page-size="1" show-elevator style="margin: 10px"/>
              <labelling
                :height="(height-90-(messages[currentIndex].role==='cus'? 60:0))+'px'"
                ref="labelling"
                :message="messages[currentIndex]"
                :role="messages[currentIndex].role"
                :sendDisabled="disabled"
                :actions="allActions"
                :conversationId="dialogId"
              />
            </div>
          </Col>
        </Row>
      </div>
    </Card>
  </div>
</template>
<script>
import message from '../../components/message'
import actionPanel from './actionPanel'
import labelling from './labelling'

const reader = new FileReader()
export default {
  components: {
    message,
    actionPanel,
    labelling
  },
  data () {
    return {
      height: window.screen.availHeight - 150,
      fileName: '',
      dialogs: [],
      messages: [],
      dialogId: '',
      userConfig: {...window.chatterConfig},
      currentDialogIndex: 0,
      currentIndex: 0,
      loading: false,
      allActions: {...window.allActions},
      disabled: false
    }
  },
  methods: {
    messageSelected (index) {
      this.messages.splice(this.currentIndex, 1, this.$refs.labelling.getUpdated())
      this.currentIndex = index
    },
    readLabelled (event) {
      this.loading = true
      var file = event.target.files[0]
      this.messages = []
      this.dialogs = []
      this.currentIndex = 0
      reader.addEventListener('loadend', () => {
        let fileData = JSON.parse(reader.result)
        fileData.forEach(d => {
          this.dialogs.push(d)
        })
        this.dialogChanged(1)
        this.fileName = file.name
        this.loading = false
      })
      reader.readAsText(file)
    },
    dialogChanged (page) {
      if (this.$refs.labelling) {
        this.messages[this.currentIndex] = {...this.$refs.labelling.getUpdated()}
        this.dialogs[this.currentDialogIndex] = [this.dialogId, ...this.messages]
      }
      this.currentDialogIndex = page - 1
      let length = this.dialogs[page - 1].length
      this.dialogId = this.dialogs[page - 1][0]
      this.messages = []
      this.dialogs[page - 1].slice(1, length).forEach(message => {
        let role = message.from.indexOf('user') > -1 ? 'cus' : 'sys'
        this.messages.push({
          ...message,
          position: role === 'sys' ? 'left' : 'right',
          role: role,
          color: role !== 'sys',
          topText: '已标注',
          userName: message.from
        })
      })
    },
    generateFile () {
      this.messages[this.currentIndex] = {...this.$refs.labelling.getUpdated()}
      this.dialogs[this.currentDialogIndex] = [this.dialogId, ...this.messages]
      // this.actions[this.currentIndex] = [...this.currentActions]
      var aTag = document.createElement('a')
      var json = []
      // let finish = true
      let i = 0
      for (i = 0; i < this.dialogs.length; i++) {
        let id = this.dialogs[i][0]
        let msgs = this.dialogs[i].slice(1, this.dialogs[i].length)
        msgs = msgs.map(m => {
          return {
            from: m.from,
            to: m.to,
            type: m.type,
            selectedSearch: m.selectedSearch,
            state: m.state,
            action: m.action,
            response: m.response,
            sendAnother: m.sendAnother
          }
        })
        json[i] = [id, ...msgs]
      }
      var blob = new Blob([JSON.stringify(json, null, 2)])
      aTag.download =
        this.fileName
      aTag.href = URL.createObjectURL(blob)
      aTag.click()
      URL.revokeObjectURL(blob)
    }
  }
}
</script>
