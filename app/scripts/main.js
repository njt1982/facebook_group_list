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
    backboneFetchCache: '../bower_components/backbone-fetch-cache/backbone.fetch-cache',
    bootstrapSassOfficial: '../bower_components/bootstrap-sass-official/assets/javascripts/bootstrap',
    lodash: '../bower_components/lodash/dist/lodash.compat',
    modernizr: '../bower_components/modernizr/modernizr',
    requirejs: '../bower_components/requirejs/require',
    requirejsText: '../bower_components/requirejs-text/text',
    listjs : '../bower_components/listjs/dist/list'
  },
  packages: []
});



require([
  'backbone', 'hello', 'jquery', 'underscore', 'listjs', 'backboneFetchCache'
], function (Backbone, Hello, $, _, List) {
  var $loginButton = $('#facebook_login'),
    $logoutMenu = $('#logout_menu');

  Hello.init({
    facebook: '483331355160349'
  }, {
    redirect_uri: '/redirect.html',
    oauth_proxy: 'https://auth-server.herokuapp.com/proxy'
  });

  var facebook = Hello('facebook');


  var GroupFeedItem = Backbone.Model.extend({});

  var GroupFeedItemCollection = Backbone.Collection.extend({
    model: GroupFeedItem,
    groupId: null,

    initialize: function (groupId) {
      this.groupId = groupId;
      this.fetch({ cache: true, url:  this.groupId + '/feed?limit=200&fields=id,from,message'});
    },
    sync: function (method, collection, options) {
      if (method == 'read') {
        var d = $.Deferred();

        facebook.api(options.url).then(function (response) {
          d.resolve(response.data);
          options.success(response.data);
        }, function(response) {
          d.fail(response);
        });

        return d;
      }
    }
  });


  var Group = Backbone.Model.extend({});

  var GroupCollection = Backbone.Collection.extend({
    model: Group,
    initialize: function () {
      this.fetch({ cache: true, url: 'me/groups' });
    },
    sync: function (method, collection, options) {
      if (method == 'read') {
        var d = $.Deferred();

        facebook.api(options.url).then(function (response) {
          d.resolve(response.data);
          options.success(response.data);
        }, function(response) {
          d.fail(response);
        });

        return d;
      }
    }
  });


  var GroupView = Backbone.View.extend({
    tagName: 'div',
    className: 'group col-sm-4 col-md-4',

    template: _.template($('#group-template').html()),

    initialize: function () {
      this.listenTo(this.model, 'change', this.render);
    },
    events: {
      "click button.group-search": "navigateToGroup"
    },
    navigateToGroup: function () {
      Backbone.history.navigate('group/' + this.model.id, {trigger: true});
    },

    render: function () {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    }
  });

  var GroupsView = Backbone.View.extend({
    className: 'group-wrapper row',
    groups: null,

    initialize: function () {
      this.groups = new GroupCollection();
      this.listenTo(this.groups, 'add', this.addOne);
      this.listenTo(this.groups, 'reset', this.addAll);
      this.listenTo(this.groups, 'all', this.render);
    },

    addOne: function (group) {
      var view = new GroupView({model: group});
      this.$el.append(view.render().el);
    },

    addAll: function () {
      this.groups.each(this.addOne, this);
      this.render();
    }
  });



  var GroupFeedItemCollectionView = Backbone.View.extend({
    className: 'item-feed-view row',
    items: null,
    list: null,

    initialize: function (groupId) {
      this.items = new GroupFeedItemCollection(groupId);

      this.$el.append('<input type="text" class="form-control search" placeholder="Search">');
      this.$el.append('<div class="list col-md-12"></div>');

      this.list = new List(this.el, {
        valueNames: [ "name", "message"],
        item: '<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title name"></h4></div><div class="panel-body"><p class="message"></p></div></div>'
      }, []);
      this.list.clear();

      this.listenTo(this.items, 'add', this.addOne);
      this.listenTo(this.items, 'reset', this.addAll);
      this.listenTo(this.items, 'all', this.render);
    },

    addOne: function (item) {
      this.list.add({
        name: item.attributes.from.name,
        message: item.attributes.message
      });
    },

    addAll: function () {
      this.items.each(this.addOne, this);
      this.render();
    },

  });




  var AppView = Backbone.View.extend({
    el: $('#groups'),
    title: null,
    links: [],
    childView: null,

    template: _.template($('#navbar-template').html()),

    render: function () {
      this.$el.html(this.template({title: this.title, links: this.links }));
      this.$el.append(this.childView.$el);
      return this;
    }
  });


  var AppRouter = Backbone.Router.extend({
    appView: null,

    initialize: function () {
      this.appView = new AppView();
    },
    routes: {
      "": "groupListing",
      "group/:groupId": "groupPage"
    },
    groupListing: function () {
      this.appView.childView = new GroupsView();
      this.appView.title = 'Browse';
      this.appView.links = [];
      this.appView.render();
    },
    groupPage: function (id) {
      this.appView.childView = new GroupFeedItemCollectionView(id);
      this.appView.title = 'Search';
      this.appView.links = [{path: '', text: 'Browse'}];
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
  Backbone.history.start();

  facebook.on('auth.login', function (data) {
    if (data.network === 'facebook' && data.authResponse.access_token !== undefined) {
      $loginButton.removeClass('hidden');
      new AppRouter();
    }
  });

});
