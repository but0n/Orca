'use strict'

function Source (terminal) {
  const fs = require('fs')
  const path = require('path')
  const { dialog, app } = require('electron').remote

  this.path = null

  this.start = function () {
    this.new()
  }

  this.new = function () {
    console.log('Source', 'Make a new file..')
    this.path = null
    terminal.orca.reset()
    terminal.resize()
    terminal.history.reset()
    terminal.cursor.reset()
    terminal.clock.play()
  }

  this.open = function () {
    console.log('Source', 'Open a file..')
    let paths = dialog.showOpenDialog(app.win, { properties: ['openFile'], filters: [{ name: 'Orca Machines', extensions: ['orca'] }] })
    if (!paths) { console.log('Nothing to load'); return }
    this.read(paths[0])
  }

  this.save = function (as = false, quit = false) {
    console.log('Source', 'Save a file..')
    if (this.path && !as) {
      this.write(this.path)
    } else {
      this.saveAs(quit)
    }
  }

  this.saveAs = function (quit = false) {
    console.log('Source', 'Save a file as..')
    dialog.showSaveDialog((path) => {
      if (path === undefined) { return }
      if (path.indexOf('.orca') < 0) { path += '.orca' }
      terminal.source.write(path)
      terminal.source.path = path
      if (quit === true) {
        app.exit()
      }
    })
  }

  this.revert = function () {
    if (!this.path) { return }
    console.log('Source', 'Revert a file..')
    this.read(this.path)
  }

  // I/O

  this.write = function (path, data = this.generate()) {
    console.log('Source', 'Writing ' + path)
    fs.writeFile(path, data, (err) => {
      if (err) { alert('An error ocurred updating the file' + err.message); console.warn(err) }
      terminal.source.remember('active', path)
    })
  }

  this.read = function (path = this.path) {
    if (!path) { return }
    console.log('Source', 'Reading ' + path)
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) { console.warn(err); terminal.source.new(); return }
      terminal.source.path = path
      terminal.source.remember('active', path)
      terminal.load(this.parse(data))
    })
  }

  this.quit = function () {
    if (this.hasChanges() === true) {
      this.verify()
    } else {
      app.exit()
    }
  }

  this.hasChanges = function () {
    if (terminal.history.length() < 3) { return }
    console.log('Source', 'Looking for changes..')
    if (!this.path) {
      console.log('Source', 'File is unsaved..')
      return true
    } else {
      console.log('Source', 'Comparing with last saved copy..')
      if (fs.existsSync(this.path)) {
        return isDifferent(fs.readFileSync(this.path, 'utf8'), this.generate())
      }
    }
  }

  this.verify = function () {
    let response = dialog.showMessageBox(app.win, {
      type: 'question',
      buttons: ['Cancel', 'Discard', 'Save'],
      title: 'Confirm',
      message: 'Unsaved data will be lost. Would you like to save your changes before leaving?',
      icon: path.join(__dirname, '../../icon.png')
    })
    if (response === 2) {
      this.save(true, true)
    } else if (response === 1) {
      app.exit()
    }
  }

  // LocalStorage

  this.resume = function () {
    const path = this.recall('active')
    if (path) {
      this.read(path)
    }
  }

  this.remember = function (key, val) {
    if (!key || !val) { return }
    console.log('Source', `Remember: ${key}=${val}`)
    localStorage.setItem(key, val)
  }

  this.recall = function (key) {
    if (!key) { return }
    if (localStorage.hasOwnProperty(key)) {
      console.log('Source', `Recall: ${key}`)
      return localStorage.getItem(key)
    }
  }

  this.forget = function (key) {
    if (!key) { return }
    console.log('Source', `Forget: ${key}`)
    localStorage.removeItem(key)
  }

  // Converters

  this.generate = function (orca = terminal.orca) {
    return `${orca}`
  }

  this.parse = function (text) {
    const lines = text.split('\n')
    const w = lines[0].length
    const h = lines.length
    const s = lines.join('\n').trim()
    return terminal.orca.load(w, h, s)
  }

  // Etc

  this.name = function (path = this.path) {
    return path ? path.substr(path.lastIndexOf('/') + 1).replace('.orca', '').trim() : null
  }

  this.folder = function (path = this.path) {
    return path ? path.substring(0, path.lastIndexOf('/')).trim() : null
  }

  this.toString = function () {
    return this.path ? this.name() : 'blank'
  }

  function isDifferent (a, b) {
    return a.replace(/[^a-zA-Z0-9+]+/gi, '').trim() !== b.replace(/[^a-zA-Z0-9+]+/gi, '').trim()
  }
}

module.exports = Source
