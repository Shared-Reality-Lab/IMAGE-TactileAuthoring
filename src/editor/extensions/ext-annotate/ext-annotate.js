/**
 * @file ext-annotate.js
 *
 * @license MIT
 *
 * @copyright 2010 Jeff Schiller
 * @copyright 2021 OptimistikSAS
 *
 */

const name = 'annotate'
import labelDialogHTML from './labelDialog.html'

const template = document.createElement('template')
template.innerHTML = labelDialogHTML

const loadExtensionTranslation = async function (svgEditor) {
  let translationModule
  const lang = svgEditor.configObj.pref('lang')
  try {
    translationModule = await import(`./locale/${lang}.js`)
  } catch (_error) {
    console.warn(`Missing translation (${lang}) for ${name} - using 'en'`)
    translationModule = await import('./locale/en.js')
  }
  svgEditor.i18next.addResourceBundle(lang, name, translationModule.default)
}

/**
 * @class SeLabelDialog
 */
export class SeLabelDialog extends HTMLElement {
  /**
    * @function constructor
    */
  constructor () {
    super()
    // create the shadowDom and insert the template
    this._shadowRoot = this.attachShadow({ mode: 'open' })
    this._shadowRoot.append(template.content.cloneNode(true))
    this.$dialog = this._shadowRoot.querySelector('#label_box')
    this.$okBtn = this._shadowRoot.querySelector('#label_ok')
    this.$cancelBtn = this._shadowRoot.querySelector('#label_cancel')
    this.$shortLabel = this._shadowRoot.querySelector('#short_label')
    this.modifying = false
  }

  /**
   * @function init
   * @param {any} name
   * @returns {void}
   */
  init (i18next) {
    this.setAttribute('label-ok', i18next.t(`common.ok`))
    this.setAttribute('label-cancel', i18next.t(`common.cancel`))
    this.setAttribute('label-short_label', i18next.t(`${name}:label.short_label`))
    
  }

  /**
   * @function observedAttributes
   * @returns {any} observed
   */
  static get observedAttributes () {
    return ['dialog', 'label-ok', 'label-cancel', 'label-short_label', 'short_label']
  }

  /**
   * @function attributeChangedCallback
   * @param {string} name
   * @param {string} oldValue
   * @param {string} newValue
   * @returns {void}
   */
  attributeChangedCallback (name, oldValue, newValue) {
    let node
    switch (name) {
      case 'dialog':
        if (newValue === 'open') {
          this.$dialog.open()
          let element
          this.modifying = true
          if (svgEditor.svgCanvas.getSelectedElements()[0]==null){
            svgEditor.svgCanvas.addToSelection([document.getElementById(svgEditor.svgCanvas.getId())])
            this.modifying = false
          }
          // console.warn(svgEditor.svgCanvas.getSelectedElements()[0])
          element = document.getElementById(svgEditor.svgCanvas.getSelectedElements()[0].id)

          if (element.hasAttribute('data-image-label'))
            {
              this.$shortLabel.value= element.getAttribute('data-image-label')
            }else{
            this.$shortLabel.value = ''}
        } else {
          this.$dialog.close()
        }

        

        break
      case 'label-ok':
        this.$okBtn.textContent = newValue
        break
      case 'label-cancel':
        this.$cancelBtn.textContent = newValue
        break
      case 'label-short_label':
        node = this._shadowRoot.querySelector('#object_label')
        node.textContent = newValue
        break
      case 'short_label':
        break 
      default:
      // super.attributeChangedCallback(name, oldValue, newValue);
        break
    }
  }
/**
   * @function connectedCallback
   * @returns {void}
   */
connectedCallback () {
  const onSaveHandler = () => {
      const element = document.getElementById(svgEditor.svgCanvas.getSelectedElements()[0].id)
      // console.warn(element.nodeName)
      element.setAttribute('data-image-label', this.$shortLabel.value)
      document.getElementById('se-label-dialog').setAttribute('dialog', 'close')
      let label;
      //let element = svgEditor.svgCanvas.getElement(svgEditor.svgCanvas.getId())
      if (this.$shortLabel.value!='')
        label= element.getAttribute('data-image-label')
      else
        label = '\<Untitled\>'
      if (!this.modifying)
        addTextLabel()
      let el = document.querySelector('[data-image-id=' + element.getAttribute('id') + ']')
      el.textContent = label
      svgEditor.svgCanvas.clearSelection()
    }

    const onCancelHandler = () => {
      document.getElementById('se-label-dialog').setAttribute('dialog', 'close')
      const element = document.getElementById(svgEditor.svgCanvas.getSelectedElements()[0].id)
      // console.warn(element.nodeName)
      if (this.$shortLabel.value=='' && 
        document.querySelector('[data-image-id=' + element.getAttribute('id') + ']')==null &&
        !this.modifying)
          {
            let label = '\<Untitled\>'
            addTextLabel()
            let el = svgEditor.svgCanvas.getElement(svgEditor.svgCanvas.getId())
            el.textContent = label
          }
      svgEditor.svgCanvas.clearSelection() 
    }

    const addTextLabel = () =>{
      let element = svgEditor.svgCanvas.getElement(svgEditor.svgCanvas.getId())
      const curShape = svgEditor.svgCanvas.getStyle()
          
      let x = element.getAttribute('x');
      let y = element.getAttribute('y');
      svgEditor.svgCanvas.addSVGElementsFromJson({
          element: 'text',
          curStyles: true,
          attr: {
            x,
            y,
            id: svgEditor.svgCanvas.getNextId(),
            fill: svgEditor.svgCanvas.getCurText('fill'),
            'stroke-width': svgEditor.svgCanvas.getCurText('stroke_width'),
            'font-size': svgEditor.svgCanvas.getCurText('font_size'),
            'font-family': svgEditor.svgCanvas.getCurText('font_family'),
            'text-anchor': 'start',
            'xml:space': 'preserve',
            'data-image-id': element.getAttribute('id'),
            opacity: curShape.opacity
          }
        })
      let el = svgEditor.svgCanvas.getElement(svgEditor.svgCanvas.getId())
      let bbox = svgEditor.svgCanvas.getBBox(el);
      
      y = y - (bbox.height/2)
      svgEditor.svgCanvas.assignAttributes(el,
        {y: y}
      )
    }
  svgEditor.$click(this.$okBtn, onSaveHandler)
  svgEditor.$click(this.$cancelBtn, onCancelHandler)
}
}

// Register
customElements.define('se-label-dialog', SeLabelDialog)  

export default {
  name,
  async init () {
    const svgEditor = this
    const { svgCanvas } = svgEditor
    const svgroot = svgCanvas.getSvgRoot()
    await loadExtensionTranslation(svgEditor)
    const { ChangeElementCommand } = svgCanvas.history
    // svgdoc = S.svgroot.parentNode.ownerDocument,
    const addToHistory = (cmd) => { svgCanvas.undoMgr.addCommandToHistory(cmd) }
    const { $id, $click } = svgCanvas

    return {
      name: svgEditor.i18next.t(`${name}:name`),
      callback () {
        // Add the button and its handler(s)
        const title = `${name}:buttons.0.title`
        const key = `${name}:buttons.0.key`
        const buttonTemplate = `
        <se-button id="tool_annotate" title="${title}" src="rect.svg" shortcut=${key}></se-button>
        `
        svgCanvas.insertChildAtIndex($id('tools_left'), buttonTemplate, 3)
        const labelDialog = document.createElement('se-label-dialog')
        labelDialog.setAttribute('id', 'se-label-dialog')
        document.getElementById('container').append(labelDialog)
        labelDialog.init(svgEditor.i18next)
        $click($id('tool_annotate'), () => {
          if (this.leftPanel.updateLeftPanel('tool_select')) {
          svgCanvas.setMode('annotate')
          }}
          )
      },
      mouseDown(evt){
        const mode = svgCanvas.getMode()
        //console.warn(document.querySelector('[data-image-id='+'svg_1'+']'))
        if (mode === "annotate") {
          svgCanvas.clearSelection()
          //console.warn('Here!')
          const e = evt.event
          const curShape = svgCanvas.getStyle()
          const pt = transformPoint(e.clientX, e.clientY, svgCanvas.getrootSctm())
          let x = pt.x 
          let y = pt.y

          svgCanvas.setStarted(true)
          svgCanvas.setStartX(x)
          svgCanvas.setStartY(y)
          svgCanvas.addSVGElementsFromJson({
            element: 'rect',
            curStyles: false,
            attr: {
              x,
              y,
              width: 0,
              height: 0,
              stroke: 'black',
              fill:'none',
              id: svgCanvas.getNextId(),
              opacity: curShape.opacity / 2
            }
          })

          const { target } = e
          if (!['svg', 'use', 'text'].includes(target.nodeName)){
            svgCanvas.addToSelection([target])
            //document.getElementById('se-label-dialog').setAttribute('dialog', 'open')
          }
        }
      },
      mouseMove(evt){
        const mode = svgCanvas.getMode()
        if (mode === "annotate") {
        const e = evt.event
        const pt = transformPoint(e.clientX, e.clientY, svgCanvas.getrootSctm())
        let x = pt.x 
        let y = pt.y
        const shape = svgCanvas.getElement(svgCanvas.getId())
        const maintainAspectRatio = (e.shiftKey)
      
        //console.warn(x, y)
        let w = Math.abs(x - svgCanvas.getStartX())
        let h = Math.abs(y - svgCanvas.getStartY())
        let newX; let newY
        if (maintainAspectRatio) {
          w = h = Math.max(w, h)
          newX = svgCanvas.getStartX() < x ? svgCanvas.getStartX() : svgCanvas.getStartX() - w
          newY = svgCanvas.getStartY() < y ? svgCanvas.getStartY() : svgCanvas.getStartY() - h
        } else {
          newX = Math.min(svgCanvas.getStartX(), x)
          newY = Math.min(svgCanvas.getStartY(), y)
        }

      
      svgCanvas.assignAttributes(shape, {
        width: w,
        height: h,
        x: newX,
        y: newY
      }, 1000)}
      },
      mouseUp(evt){
        const mode = svgCanvas.getMode()
        if (mode === "annotate") {
        const e = evt.event
        let element = svgCanvas.getElement(svgCanvas.getId())
        const width = element.getAttribute('width')
        const height = element.getAttribute('height')
        const widthNum = Number(width)
        const heightNum = Number(height)
        let keep = false
        keep = widthNum >= 1 || heightNum >= 1
        //console.warn(svgEditor.svgCanvas.getSelectedElements()[0])
        if (keep){
          svgEditor.svgCanvas.clearSelection()
        }
        if (keep || svgEditor.svgCanvas.getSelectedElements()[0]!= null)
          document.getElementById('se-label-dialog').setAttribute('dialog', 'open')
        return {
          keep: keep,
          element: element,
          started: false
        }}
      }

  }
}
}
const transformPoint = function (x, y, m) {
  return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }
}

