import Vue from 'vue'
import index from './index.vue'
import ViewUI from 'view-design'
import locale from 'view-design/dist/locale/en-US'
import ClickOutside from 'vue-click-outside'
import vueDebounce from 'vue-debounce'
import axios from 'axios'
import utils from '../../utils/util'
import './../theme.less'

Vue.use(ViewUI, { locale })
Vue.directive('click-outside', ClickOutside)
utils.initAxios(axios, ViewUI, Vue)
Vue.use(vueDebounce, {
  listenTo: 'input',
  defaultTime: '1s'

})
// eslint-disable-next-line no-new
new Vue({
  el: '#app',
  render: h => h(index)
})
