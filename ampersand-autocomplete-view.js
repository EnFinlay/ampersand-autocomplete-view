/* opts:
 *  - name:       name of the field
 *  - parent:     parent form reference
 *  - options:    array/collection of options to render into the select box
 *  - [unselectedText]: text to display if unselected
 *  - [value]:    initial value for the field
 *  - [el]:       dom node to use for the view
 *  - [required]: is field required
 *
 *  - [validClass]: class to apply to root element if valid
 *  - [invalidClass]: class to apply to root element if invalid
 *  - [requiredMessage]: message to display if invalid and required
 *
 *  Additional opts, if options is a collection:
 *  - [idAttribute]: model attribute to use as the id for the option node
 *  - [textAttribute]: model attribute to use as the text of the option node in the select box
 *  - [yieldModel]: (defaults true) if options is a collection, yields the full model rather than just it's id to .value
 */

var View = require('ampersand-view');

var ItemView = View.extend({
  autoRender: true,
  template: ['<a data-hook="id"></a>'].join(''),
  bindings: {
    'model.id': '[data-hook=id]'
  },
  events: {
    'click': 'selectItem',
    'mouseover': 'activateItem'
  },
  initialize: function(options) {
    this.parent = options.parent;
  },
  selectItem: function() {
    this.parent.selectModel(this.model);
  },
  activateItem: function() {
    this.parent.activateModel(this.model);
  },
});

module.exports = View.extend({
  template: [
    '<label>',
    '<span data-hook="label"></span>',
    '<input class="form-input">',
    '<ul class="dropdown-menu"></ul>',
    '<div data-hook="message-container" class="message message-below message-error">',
    '<p data-hook="message-text"></p>',
    '</div>',
    '</label>'
  ].join(''),
  bindings: {
    'name': {
      type: 'attribute',
      selector: 'input',
      name: 'name'
    },
    'label': [{
      hook: 'label'
    },{
      type: 'toggle',
      hook: 'label'
    }
    ],
    'message': {
      type: 'text',
      hook: 'message-text'
    },
    'showMessage': {
      type: 'toggle',
      hook: 'message-container'
    },
    'validityClass': {
      type: 'class',
      selector: 'select'
    },
    'rootElementClass': {
      type: 'class',
      selector: ''
    }
  },
  props: {
    value: 'any',
    startingValue: 'any',
    options: 'any',
    name: 'string',
    label: ['string', true, ''],
    required: ['boolean', true, true],
    shouldValidate: ['boolean', true, false],
    message: ['string', true, ''],
    requiredMessage: ['string', true, 'This field is required.'],
    validClass: ['string', true, 'input-valid'],
    invalidClass: ['string', true, 'input-invalid'],
    rootElementClass: ['string', true, '']
  },
  events: {
    'keyup': 'keyup',
    'keypress': 'keypress',
    'keydown': 'keydown',
    'blur input': 'blur',
    'focus input': 'focus',
    'mouseenter': 'mouseenter',
    'mouseleave': 'mouseleave'
  },
  derived: {
    valid: {
      deps: ['value'],
      fn: function () {
        return !this.runTests();
      }
    },
    showMessage: {
      deps: ['message', 'shouldValidate'],
      fn: function () {
        return this.shouldValidate && this.message;
      }
    },
    changed: {
      deps: ['value', 'startingValue'],
      fn: function () {
        return this.value !== this.startingValue;
      }
    },
    validityClass: {
      deps: ['valid', 'validClass', 'invalidClass', 'shouldValidate', 'changed'],
      fn: function () {
        if (!this.shouldValidate || !this.changed) {
          return '';
        } else {
          return this.valid ? this.validClass : this.invalidClass;
        }
      }
    }
  },
  initialize: function (opts) {
    opts = opts || {};

    if (typeof opts.name !== 'string') {
      throw new Error('SelectView requires a name property.');
    }
    this.name = opts.name;

    if (!Array.isArray(opts.options) && !opts.options.isCollection) {
      throw new Error('SelectView requires select options.');
    }
    this.options = opts.options;

    if (this.options.isCollection) {
      this.idAttribute = opts.idAttribute || this.options.mainIndex || 'id';
      this.textAttribute = opts.textAttribute || 'text';
    }

    this.el = opts.el;
    this.value = opts.value;
    this.label = opts.label || this.name;
    this.parent = opts.parent || this.parent;
    this.template = opts.template || this.template;
    this.placeHolder = opts.placeHolder;
    this.yieldModel = (opts.yieldModel === false) ? false : true;

    this.tests = this.tests || opts.tests || [];
    this.startingValue = this.value;
    this.on('change:valid change:value', this.reportToParent, this);

    this.results = []; // matched results as an array of Backbone Models

    // Boolean toggles
    this.focused = false; // Is the input in focus?
    this.shown = false; // Is the menu shown?
    this.mousedover = false; // Is the mouse over the typeahead (incl. menu)?

    this.render();
  },
  render: function () {
    this.renderWithTemplate();
    this.input = this.query('input');
    this.menu = this.query('ul');
  },
  // Called by searchInput and whenever models change
  rerender: function(models) {
    this.menu.innerHTML = null;
    models.forEach(this.renderModel, this);
    if (models.length) {
      this.show();
    } else {
      this.hide();
    }
  },
  renderModel: function(model) {

    var li = document.createElement('li');

    this.renderSubview(new ItemView({model: model, parent: this}), li);
   // var view = new this.view({model: model}).render().el;

   // li.appendChild(view);
    this.menu.appendChild(li);
  },
  // Return the models with a key that matches a portion of the given value
  search: function(value) {
    // Use a regex to quickly perform a case-insensitive match
    var re = new RegExp(value, 'i');
    var key = this.idAttribute;
    return this.options.filter(function(model) {
      return re.test(model.get(key));
    });
  },
  handleInputChanged: function () {
    if (document.activeElement === this.input) {
      this.directlyEdited = true;
    }
    //this.inputValue = this.clean(this.input.value);
    this.input.value = '';
  },
  // Convenience method for clearing the search input
  clearInput: function() {
    this.input.value = '';
  },
  // Pull the value from the search input and re-render the matched models
  searchInput: function() {
    // TODO it'd be nice to limit the results during array iteration
    this.results = this.search(this.input.value).slice(0, this.options.limit);
    this.rerender(this.results);
  },
  select: function() {
    // TODO This may go wrong with different templates
    var index = this.menu.find('.active').index();
    this.selectModel(this.results[index]);
  },
  selectModel: function(model) {
    // Update the input field with the key attribute of the select model
    var key = this.idAttribute;
    this.input.value = model.get(key);
    // Hide the menu
    this.hide();
    // TODO What other parameters should be in the trigger?
    this.trigger('selected', model, this.collection);
    // Empty the results
    this.results = [];
  },
  activateModel: function(model) {
    console.log(model);
    this.menu.find('.active').removeClass('active');
  },
  // Misc. events
  keyup: function(evt) {
    switch(evt.keyCode) {
      case 40: // Down arrow
      case 38: // Up arrow
      case 16: // Shift
      case 17: // Ctrl
      case 18: // Alt
        break;
      // case 9: // Tab - disabled to prevent rogue select on tabbed focus
      // TODO tab should also leave focus
      case 13: // Enter
        // TODO shown needs to be returned to its original function (as an
        // indicator of whether the menu is currently displayed or not)
        if (!this.shown) {
          return;
        }
        this.select();
        break;
      case 27: // escape
        if (!this.shown) {
          return;
        }
        this.hide();
        break;
      default:
        this.searchInput();
    }
    evt.stopPropagation();
    evt.preventDefault();
  },
  // Menu state
  focus: function() {
    this.focused = true;
    // TODO Only show the menu if no item has been selected
    if (!this.shown) {
      this.show();
    }
  },
  blur: function() {
    this.focused = false;
    if (!this.mousedover && this.shown) this.hide();
  },
  mouseenter: function() {
    this.mousedover = true;
    // TODO Re-add 'active' class to the current target
  },
  mouseleave: function() {
    this.mousedover = false;
    if (!this.focused && this.shown) this.hide();
  },
  // Allow the user to change their selection with the keyboard
  keydown: function(evt) {
    // TODO I still hate this array check
    var keycodes = [40,38,9,13,27];
    this.suppressKeyPressRepeat = keycodes.indexOf(evt.keyCode) !== -1;
    this.move(evt);
  },
  keypress: function(evt) {
    // The suppressKeyPressRepeat check exists because keydown and keypress
    // may fire for the same event
    if (this.suppressKeyPressRepeat) {
      return;
    }
    this.move(evt);
  },
  move: function(evt) {
    if (!this.shown) {
      return;
    }
    switch(evt.keyCode) {
      case 9: // Tab
      case 13: // Enter
      case 27: // Escape
        evt.preventDefault();
        break;
      case 38: // Up arrow
        evt.preventDefault();
        this.prevItem();
        break;
      case 40: // Down arrow
        evt.preventDefault();
        this.nextItem();
        break;
    }
    evt.stopPropagation();
  },
  prevItem: function() {
    // TODO should there be signals for prev and next?
    var active = this.menu.find('.active').removeClass('active');
    var prev = active.prev();
    if (!prev.length) prev = this.menu.find('li').last();
    prev.addClass('active');
  },
  nextItem: function() {
    var active = this.menu.find('.active').removeClass('active');
    var next = active.next();
    if (!next.length) next = this.menu.find('li').first();
    next.addClass('active');
  },
  // Show or hide the menu depending on the typeahead's state
  show: function() {
    // DO not show if there are no results
    if (!this.results.length) return;
    /*var pos = $.extend(
        {},
        this.$input.position(),
        // Calling the [0] index returns the vanilla HTML object
        {height: this.$input[0].offsetHeight}
    ); */
    var pos = this.input.style;
    this.menu.style.top = pos.top + pos.height + this.input.offsetHeight;
    this.menu.style.left = pos.left;
    this.menu.style.display = 'block';
    this.shown = true;
    return this;
  },
  hide: function() {
    this.menu.style.display = 'none';
    this.shown = false;
    return this;
  },
  runTests: function () {
    return;
    /*var message = this.getErrorMessage();
    if (!message && this.inputValue && this.changed) {
      // if it's ever been valid,
      // we want to validate from now
      // on.
      this.shouldValidate = true;
    }
    this.message = message;
    return message;*/
  },
  initInputBindings: function () {
    this.input.addEventListener('blur', this.blur, false);
    this.input.addEventListener('input', this.handleInputChanged, false);
  },
  remove: function () {
    this.select.removeEventListener('change', this.handleChange, false);
    View.prototype.remove.apply(this, arguments);
  },
  reportToParent: function () {
    if (this.parent) this.parent.update(this);
  }
});