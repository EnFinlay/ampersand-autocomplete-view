
/*global console*/
var AutoCompleteView = require('../ampersand-autocomplete-view');
var FormView = require('ampersand-form-view');

var Model = require('ampersand-state').extend({
  props: {
    id: 'string',
    title: 'string'
  }
});
var Collection = require('ampersand-collection').extend({
  model: Model
});

var collection = new Collection([
  { id: 'red', title: 'Red' },
  { id: 'yellow', title: 'Yellow' },
  { id: 'blue', title: 'Blue' }
]);


var BaseView = FormView.extend({
  fields: function () {
    return [
      new AutoCompleteView({
        name: 'autocomplete',
        parent: this,
        options: collection,
        idAttribute: 'id',
        textAttribute: 'title',
        placeHolder: 'Please choose one'
      })
    ];
  }
});


document.addEventListener('DOMContentLoaded', function () {
  var baseView = new BaseView({el: document.body });
  baseView.on('all', function (name, field) {
    console.log('Got event', name, field.value, field.valid);
  });
  baseView.render();
});