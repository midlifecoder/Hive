$(function() {
  App.Router = new (Backbone.Router.extend({

    routes: {
      '' : 'Bees',
      'bees' : 'Bees',
      'bee/:beeId' : 'Bee',
      'bee/edit/:beeId' : 'BeeForm',
      'sensor/:sensorId/:starteDate/:endDate' : 'BeeSensor',
      'sensor/:sensorId' : 'Sensor',
      'recipe/add/:beeId' : 'RecipeAdd',
      'recipe/:triggerId' : 'Recipe',
      'settings' : 'Settings'
    },

    
    Settings: function() {
      
      var ev = new Backbone.Model()
      
      var settings = new App.Models.Settings()
      var settingsForm = new App.Views.SettingsForm()

      var drives = new App.Collections.Drives()
      var drivesTable = new App.Views.DrivesTable()

      settingsForm.once('done', function() {
        Backbone.history.navigate('', {trigger: true})
      })
      
      App.clear()
      App.append(settingsForm.el)
      App.append(drivesTable.el)

      ev.once('A0', function() {
        settings.fetch({success: function() {
          ev.trigger('A1')
        }})
      })

      ev.once('A1', function() {
        settingsForm.model = settings
        settingsForm.render()
      })

      ev.once('B0', function() {
        drives.on('sync', function() {
            ev.trigger('B1')
        })
        drives.fetch({success: function() {
          ev.trigger('B1')
        }})
      })

      ev.once('B1', function () {
        drivesTable.collection = drives
        drivesTable.render()
      })

      ev.trigger('A0')
      ev.trigger('B0')

    },


    Bees: function() {
        
      App.setTitle('Your Hive')
      
      // setup
      var ev = new Backbone.Model()
      
      var bees = new App.Collections.Bees()
      var beesTable = new App.Views.BeesTable()  
      
      App.clear()
      App.append(beesTable.el)
      
      // Fetch the Bees Collection and give it to beesTable
      ev.once('0', function() {
        bees.fetch({success: function(collection, response, options){
          beesTable.collection = bees
          ev.trigger('1')
        }})
      })
      
      // Render the beesTable View
      ev.once('1', function() {
        beesTable.render()
      })
    
      ev.trigger('0')      

    },


    Bee: function(beeId) {
      
      App.setTitle('')
      
      //
      // setup
      //
      
      var ev = new Backbone.Model()
      
      var bee = new App.Models.Bee({"_id": beeId})
      var beeSensors = new App.Collections.BeeSensors()
      var beeRecipes = new App.Collections.BeeRecipes()
      
      var beeSensorsTable = new App.Views.BeeSensorsTable()
      var beeRecipesTable = new App.Views.BeeRecipesTable()
      
      App.clear()
      App.append(beeSensorsTable.el)
      App.append(beeRecipesTable.el)
      
      //
      // Thread AX
      //
      
      // Fetch the beeSensors
      ev.once('A0', function() {
        beeSensors.params.beeId = beeId
        beeSensors.fetch({success: function(collection, response, options){
          ev.trigger('A1')
        }})
      })
      
      // Render the beeSensorsTable
      ev.once('A1', function() { 
        beeSensorsTable.collection = beeSensors 
        beeSensorsTable.render()
      })
      
      //
      // Thread BX
      //

      // Fetch the beeRecipes
      ev.once('B0', function() {   
        beeRecipes.params.beeId = beeId
        beeRecipes.fetch({success: function(collection, response, options){
          ev.trigger('B1')
        }})
      })
      
      // Render the beeSensorsTable
      ev.once('B1', function() { 
        beeRecipesTable.collection = beeRecipes 
        beeRecipesTable.render()
      })
      
      ev.once('C0', function() {
        bee.fetch({complete:function(){ ev.trigger('C1')}})
      })
      
      ev.once('C1', function() {
        App.setTitle(bee.get('name'))
      })
      //
      // Recipe threads
      // 
      
      ev.trigger('A0')
      ev.trigger('B0')
      ev.trigger('C0')

    },
    

    BeeForm: function(beeId) {
        
      App.setTitle('')
      
      var bee = new App.Models.Bee()
      var form = new App.Views.BeeForm({model: bee})
      App.$el.children('.body').html(form.el)
      form.once('Form:done', function() {
        Backbone.history.navigate('', {trigger: true})
      })
      if (beeId) {
        bee.id = beeId
        bee.fetch({success: function() {
          form.render()  
        }})
      }
      else {
        form.render()
      }
    },

    Sensor: function(sensorId, startDate, endDate) {
        
      App.setTitle('')
      
      //
      // setup
      //
      
      var ev = new Backbone.Model()
      
      var sensor = new App.Models.Sensor({_id: sensorId})
      App.sensorReadingsGraph = new App.Views.SensorReadingsGraph()
      
      App.clear()
      App.append(App.sensorReadingsGraph.el)
      
      //
      // Figure out which collection to use 
      //
      
      // Figure out the range parameters for the Collection...
      
      // ... from URL
      if (startDate && endDate) {
        App.startDate = startDate
        App.endDate = endDate
      }
      // ... from fallback Defaults
      else if (!App.startDate && !App.endDate) {
        // Last 24 hours from now
        App.startDate = moment().unix()-(60*60*24*1)
        App.endDate = moment().unix()
      }
      
      // Estimate the points we'll receive given the date range we now know of
      var estimatedPointsOnScreenUnreduced = (App.endDate - App.startDate) / App.sampleInterval
      
      // Now we can set the Collection on the View
      if (estimatedPointsOnScreenUnreduced > App.maxPointsOnScreen) {  
        App.sensorReadingsGraph.collection = new App.Collections.SensorJarHourlyAverageReadings()
      }
      else {
        App.sensorReadingsGraph.collection = new App.Collections.SensorReadings()
      }
      
      // Set params for the Collection
      App.sensorReadingsGraph.collection.params.startDate = App.startDate
      App.sensorReadingsGraph.collection.params.endDate = App.endDate
      App.sensorReadingsGraph.collection.params.sensorId = sensorId
      
      // Fetch Sensor
      ev.once('0', function() {
        sensor.on('sync', function() {
          ev.trigger('1')
        })
        sensor.fetch()
      })
      
      // Assign the sensor to its graph and prepare with spinner
      ev.once('1', function() {
        sensor.once('loadDefinition:done', function() {
          App.setTitle(sensor.get('name'))
        })
        sensor.loadDefinition()
        App.sensorReadingsGraph.sensor = sensor
        App.sensorReadingsGraph.prepare()
        ev.trigger('2')
      })

      // Fetch the sensorReadings Collection
      ev.once('2', function() {
        App.sensorReadingsGraph.collection.on('sync', function() {
          ev.trigger('3')
        })
        App.sensorReadingsGraph.collection.fetch()
      })
      
      // Render the graph View
      ev.once('3', function() {
        App.sensorReadingsGraph.render()
      })

      ev.trigger('0')
  
      
    },

    RecipeAdd: function(beeId) {
        
      App.setTitle('')
      
      var recipe = new App.Models.Recipe()
      recipe.once('sync', function() {
        Backbone.history.navigate('bee/' + beeId, {recipe: true})
      })
      recipe.set('bee', beeId)
      var beeSensors = new App.Collections.BeeSensors()
      beeSensors.beeId = beeId
      beeSensors.fetch()
      beeSensors.on('sync', function() {
        recipe.schema.sensor.options = _.map(beeSensors.models, function(model) {
          return {val: model.id, label: model.get('name') }
        })
        var recipeForm = new App.Views.RecipeForm({model: recipe})
        recipeForm.render()
        App.$el.children('.body').html(recipeForm.el)
      })
    },

    Recipe: function(recipeId) {
        
      App.setTitle('')
      
      var recipe = new App.Models.Recipe()
      recipe.id = recipeId
      // When the recipe loads, proceed loading the form
      recipe.once('sync', function() {
        // The next time the recipe is saved will be from the form so forward the user
        recipe.once('sync', function() {
          Backbone.history.navigate('bee/' + recipe.get('bee'), {recipe: true})
        })
        var beeSensors = new App.Collections.BeeSensors()
        beeSensors.beeId = recipe.get('bee')
        beeSensors.fetch()
        beeSensors.on('sync', function() {
          recipe.schema.sensor.options = _.map(beeSensors.models, function(model) {
            return {val: model.id, label: model.get('name') }
          })
          var recipeForm = new App.Views.RecipeForm({model: recipe})
          recipeForm.render()
          App.$el.children('.body').html(recipeForm.el)
        })
      })
      recipe.fetch()
    }

  }))

})
