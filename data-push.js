/**
 * Data Pusher supports the concept of a standard layout of a json object
 * containing an array of data objects e.g. {"items" : [{.},{.}]} each of which
 * is to be presented as a set of fields presented in the user interface.
 *
 * The endpoint takes the container and returns a url to get from.
 *
 * The render function takes an element of the resulting data array from hte url.
 *
 * Data push maintains an object with fields names matching the inputs in it's
 * matched child node.
 *
 * On document ready it uses the endpoint to GET the object. The object data
 * is then matched to the inputs based on the class of the input. Note that
 * the inputs must be marked with the correct annotation class.
 *
 * On change and on unfocus the handler will update the model and highlight with
 * the alert class changed inputs as well as the save selector
 *
*/
if (typeof jQuery == 'undefined') {
  throw 'jquery-image-scale plugin required jQuery to be loaded';
}


/**
 * Data feed function looks for a div container and renders content into it
 * matching criteria. It can be used to map general json from a get endpoint
 * to field definitions. Assumptions are that it is called on a container div
 * that holds the form and sub elements are mapped to it. Currently supports:
 *
 * + Flat json.
 * Parameter to id mapping.
 * Text inputs.
 * Check box.
 * Changed highlight.
 * Save button.
 * - Reload button.
 *
 *
 *
 */

dataFeed = {};
(function(jQuery) {

  jQuery.fn.dataFeed = function(endpoint, collection) {

    function render(data, container) {
      for (var key in data) {
        var value = data[key];
        var type = typeof(value);
        switch (type) {
          case 'boolean' :
            if (value) {
              container.find('.' + key).attr('checked', 'checked');
            } else {
              container.find('.' + key).removeAttr('checked');
            }
            break;
          case 'string' :
          case 'number' :
            container.find('.' + key).val(value);
            break;
          case 'object' : // assume is an array of items
            if ('undefined' === typeof(collection)) {
              break;
            }
            for (var i in collection) {
              var lister = collection[i];
              if (key === lister.listName) {
                var listContainer = container.find(lister.listContainer);
                var listerAddFunction = lister.addListItem;
                var listerDelFunction = lister.delListItems;
                listContainer.empty();
                for (var j in value) {
                  var listItem = lister.addListItem(listContainer);
                  // use the render function to actually write the content of
                  // the array item into the the inputs of the collection
                  render(value[j], listItem);
                }

                // look up the add delete buttons and pass the container
                container.find(lister.addItemSelector)
                    .click(function() { return function(localContainer, addFunction) {
                      if ('function' !== typeof(addFunction)) {
                        console.log('addListItem not implemented');
                        return;
                      }
                      addFunction(localContainer);
                    }(listContainer, listerAddFunction)});
                // Note the syntax of the closure which takes the current value
                // of the list container rather than the outer one which is
                // called and overridden like an attribute every function call
                container.find('.dfDelListItems')
                    .click(function() { return function(listContainer, delFunction) {
                      if ('function' !== typeof(delFunction)) {
                        console.log('delListItems not implemented');
                      }
                      delFunction(listContainer);
                    }(listContainer, listerDelFunction)});
              }
            }

        }
      }
    }

    function parse(data, container) {
      if ('undefined' === typeof(container)) {
        console.log('container is null returning');
        console.log(data);
        return;
      }
      for (var key in data) {
        var value = data[key];
        var type = typeof(value);
        switch (type) {
          case 'boolean' :
            console.log('seeking boolean ' + key);
            data[key] = container.find('.' + key)[0].checked;
            break;
          case 'string' :
          case 'number' :
            console.log('seeking string ' + key);
            var element = container.find('.' + key);
            if ('undefined' === typeof(element)) {
              console.log('element ' + key + ' not found');
            } else {
              data[key] = element.val();
            }
            break;
          case 'object' :
            console.log('Inspecting ');
            console.log(value);
            // given an array of items with a name, find the name in the
            if ('undefined' === typeof(collection)) {
              break;
            }
            // iterate over the lister and find lister for this array typeof
            for (var i in collection) {
              var lister = collection[i];
              if (key === lister.listName) {
                var listContainer = container.find(lister.listContainer);
                console.log('reading object ' + key  + ' from container ' + lister.listContainer);
                if ($.isArray(value)) {
                  var listItems = listContainer.find('.dfItemRow');
                  for (var index = 0; index < listItems.length; index++) {
                    var writeInto = index < value.length? value[index] :
                        lister.itemPrototype();
                    value[index] = parse(writeInto, $(listItems[index]));
                  }
                } else {
                  value = parse(value, listContainer);
                }
                console.log('data ' + key + ' updated to ' + value);
                data[key] = value;
                break;
              } else {
                console.log('key ' + key + ' not match lister' + lister.listName);
              }
            }
        }
      }
      console.log('returning data');
      console.log(data);
      return data;
    }

    function pull(endpoint, container) {
      $.ajax({
        url : endpoint,
        dataType : "json",
        contentType : "application/json"
      })
      .done(function(data) {
        dataFeed[container.attr('id')] = data;
        render(data, container);
      })
      .fail(function() {
        console.log("Error getting data feed for " + container.attr('id'));
      });
    }

    function push(endpoint, container) {
      var containerData = dataFeed[container.attr('id')];
      containerData = parse(containerData, container);
      dataFeed[container.attr('id')] = containerData;
      var dataString = JSON.stringify(containerData);
      $.ajax({
        type: 'POST',
        url : endpoint,
        data: dataString,
        contentType : 'application/json'
        }).done(function(data) {
          $('#saving-alert').foundation('reveal', 'close');
        }).fail(function() {
          console.log('Error updating data feed for ' + container.attr('id'));
        });
    }

    return this.each(function() {
      var container = $(this);
      container.find('.dfSave').click(function() {
        push(endpoint, container);
      });
      $(document).ready(function() {
        pull(endpoint, container);
      });
      // TODO move the lister controls here
    });
  }

  // pass a function that allows data to be returned from the source
})(jQuery);

(function(jQuery) {

  jQuery.fn.dataPush = function(endpoint, render, parentVariable, preserve) {

    if ('function' !== typeof(endpoint)) {
      alert('First parameter to data push must be a function');
    }

    if ('function' !== typeof(render)) {
      alert('Second parameter to data push must be a render function');
    }

    return this.each(function() {

      var container = $(this);

      var endpointUrl = endpoint(container);

      $.ajax({
        url : endpointUrl,
        dataType : "json",
        contentType : "application/json"
      })
        .done(function(data) {
          if ('undefined' === typeof(parentVariable)) {
            render(data, container);
          } else {
            container.empty();
            var items = data[parentVariable];
            var itemCount = items.length;
            for (var i = 0; i < itemCount; i++) {
              render(items[i], container);
            }
          }
        })
        .fail(function() {
          console.log("Error getting stuff");
        });
    });
  }

  // pass a function that allows data to be returned from the source
})(jQuery);