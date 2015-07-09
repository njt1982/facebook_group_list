/*global require*/
'use strict';

require.config({
  shim: {
    bootstrap: {
      deps: [
        'jquery'
      ],
      exports: 'jquery'
    }
  },
  paths: {
    jquery: '../bower_components/jquery/dist/jquery',
    backbone: '../bower_components/backbone/backbone',
    underscore: '../bower_components/lodash/dist/lodash',
    hello: '../bower_components/hello/dist/hello.all.min',
    bootstrap: '../bower_components/bootstrap-sass-official/assets/javascripts/bootstrap',
    'backbone-fetch-cache': '../bower_components/backbone-fetch-cache/backbone.fetch-cache',
    'bootstrap-sass-official': '../bower_components/bootstrap-sass-official/assets/javascripts/bootstrap',
    lodash: '../bower_components/lodash/dist/lodash.compat',
    modernizr: '../bower_components/modernizr/modernizr',
    requirejs: '../bower_components/requirejs/require',
    'requirejs-text': '../bower_components/requirejs-text/text'
  },
  packages: [

  ]
});

require([
  'backbone', 'hello', 'jquery', 'underscore'
], function (Backbone, Hello, $, _) {
  var $loginButton = $('#facebook_login'),
      $logoutMenu = $('#logout_menu');

  Hello.init({
    facebook: '483331355160349'
  }, {
    redirect_uri: '/redirect.html',
    oauth_proxy: 'https://auth-server.herokuapp.com/proxy'
  });

  var facebook = Hello('facebook');



  var Group = Backbone.Model.extend({
    name: function() {
      console.log(this);
      return this.attributes.name;
    },
    html_url: function() {
      ;
    }
  });

  var GroupCollection = Backbone.Collection.extend({
    model: Group,
    sync: function (method, collection, options) {
      if (method == 'read') {
        facebook.api('me/groups').then(function (response) {
          options.success(response.data);
        });
      }
    }
  });
  var groups = new GroupCollection;


  var GroupView = Backbone.View.extend({
    tagName: 'div',

    template: _.template($('#group-template').html()),

    initialize: function () {
      this.listenTo(this.model, 'change', this.render);
    },

    render: function () {
      var data = _.extend(this.model.toJSON(), {
        getUrl: function() { return 'https://www.facebook.com/groups/' + this.id; }
      });
      this.$el.html(this.template(data));
      return this;
    }
  });

  var GroupsView = Backbone.View.extend({
    initialize: function () {
      this.listenTo(groups, 'add', this.addOne);
      this.listenTo(groups, 'reset', this.addAll);
      this.listenTo(groups, 'all', this.render);
      groups.fetch();
    },

    addOne: function (group) {
      var view = new GroupsView({model: group});
      this.$el.append(view.render().el);
    },

    addAll: function () {
      groups.each(this.addOne, this);
    }
  });

  var AppView = Backbone.View.extend({
    el: $('#groups'),
    childView: null,

    render: function() {
      this.$el.html("<h2>Welcome</h2>");
      this.$el.append(this.childView.$el);
    }
  });


  var AppRouter = Backbone.Router.extend({
    selectedGroup: null,
    appView: null,

    initialize: function() {
      console.log(this);
      this.selectedGroup = null;
      this.appView = new AppView();
    },
    routes: {
      "": "groupListing",
      "group/:groupId" : "groupPage"
    },
    groupListing: function() {
      console.log(this);
      this.appView.childView = new GroupsView();
      this.appView.render();
    }
  });


  // Is expired?
  var t = Date.now() / 1000,
    auth = facebook.getAuthResponse();
  if (!auth || auth.expires < t) {
    // Expired... Show login?
    $loginButton.removeClass('hidden');
    $logoutMenu.addClass('hidden');
  }
  else {
    new AppRouter();
  }

  facebook.on('auth.login', function (data) {
    if (data.network === 'facebook' && data.authResponse.access_token !== undefined) {
      $loginButton.removeClass('hidden');
    }
  });
  Backbone.history.start();

});
