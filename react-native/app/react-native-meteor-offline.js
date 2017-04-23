import Meteor from 'react-native-meteor';
import { createStore, applyMiddleware } from 'redux';
import createLogger from 'redux-logger';
import { REHYDRATE } from 'redux-persist/constants'
import _ from 'lodash';
import { persistStore, autoRehydrate } from 'redux-persist';
import { AsyncStorage } from 'react-native';

// Actions
const ADDED = 'ddp/added';
const CHANGED  = 'ddp/changed';
const REMOVED = 'ddp/removed';

// Reducer
const reducer = (state = {}, action) => {
  const { collection, id, fields } = action.payload || {};
  switch (action.type) {
    case ADDED:
      if (!state[collection]) {
        state[collection] = {};
        return {
          ...state,
          [collection]: {
            [id]: fields,
          },
        };
      } else if (!state[collection][id]) {
        return {
          ...state,
          [collection]: {
            ...state[collection],
            [id]: fields,
          },
        }
      } else {
        return {
          ...state,
          [collection]: {
            ...state[collection],
            [id]: { ...fields, ...state[collection][id] },
          }
        };
      }
    case CHANGED:
      return {
        ...state,
        [collection]: {
          ...state[collection],
          [id]: _.merge(state[collection][id], fields),
        },
      };
    case REMOVED:
      if (state[collection] && state[collection][id]) {
        return {
          ...state,
          [collection]: _.omit(state[collection], id),
        };
      }
    case REHYDRATE:
      return action.payload;
    default:
      return state;
  }
};

const onRehydration = (store) => {
  const data = Meteor.getData();
  const db = data && data.db;
  if (db) {
    _.each(store.getState(), (collectionData, collectionName) => {
      if (!db[collectionName]){
        db.addCollection(collectionName);
      }

      const collectionArr = _.map(collectionData, (doc, _id) => {
        doc._id = _id;
        return doc;
      });
        console.log(db['links'].items);
      for (i = 0; i < collectionArr.length; i++) {

        // If the item was made offline insert to both minimongo and server 
        if(collectionArr[i].offline){
          console.log('item: ', collectionArr[i]);
          Meteor.collection(collectionName).insert(collectionArr[i], function (err, res) {
          if (err) {
            console.log('Insert error', err);
          }
          else {
            console.log('insert success: ', res);
          }
        });
      }
      else{
        // db[collectionName].upsert(collectionArr);
         db[collectionName].upsert(collectionArr[i])
         console.log('updated data ', collectionArr[i]);
      }
      }
    });
  }
};

export const initializeMeteorOffline = (opts = {}) => {
  Meteor.connect('ws://192.168.43.58:3000/websocket');
  const logger = createLogger({  diff: true, collapsed: true, predicate: () => opts.log || false });
  const store = createStore(reducer, applyMiddleware(logger), autoRehydrate());
  persistStore(store, {
    storage: AsyncStorage,
    keyPrefix: 'react-native-meteor-offline:',
    debounce: opts.debounce || 1000,
  }, () => onRehydration(store));

  Meteor.ddp.on('added', (payload) => {
    store.dispatch({ type: ADDED, payload });
  });

  Meteor.ddp.on('changed', (payload) => {
    store.dispatch({ type: CHANGED, payload });
  });

  Meteor.ddp.on('removed', (payload) => {
    store.dispatch({ type: REMOVED, payload });
  });
  return store;
};
