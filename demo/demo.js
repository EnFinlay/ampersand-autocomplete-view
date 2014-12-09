
/*global console*/
var AutoCompleteView = require('../ampersand-autocomplete-view');
var FormView = require('ampersand-form-view');

var Model = require('ampersand-state').extend({
  props: {
    mbid: 'string',
    name: 'string',
    listeners: 'string'
  },
  derived: {
    id: function() {
      return this.name;
    }
  }
});
var Collection = require('ampersand-rest-collection').extend({
  model: Model,
  url: 'http://ws.audioscrobbler.com/2.0/?method=artist.search&api_key=cef6d600c717ecadfbe965380c9bac8b&format=json',
  parse: function(response, options) {
    if (response.results) {
      return response.results.artistmatches.artist;
    }
  }
});


/*
var collection = new Collection([
  { id: 'red', title: 'Red' },
  { id: 'yellow', title: 'Yellow' },
  { id: 'blue', title: 'Blue' },
  { id: 'rat', title: 'Rat' }
]);
*/


var BaseView = FormView.extend({
  fields: function () {
    return [
      new AutoCompleteView({
        name: 'autocomplete',
        parent: this,
        options: new Collection(),
        queryKey: 'artist',
        idAttribute: 'name',
        textAttribute: 'name',
        placeHolder: 'Please choose one',
        minKeywordLength: 3,
        maxResults: 10
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