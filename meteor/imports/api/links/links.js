// Definition of the links collection

import { Mongo } from 'meteor/mongo';

export const Links = new Mongo.Collection('links');

if (Meteor.isServer) {
    // hook for removing offline flag
    Links.before.insert((userId, doc) => {
        doc.offline = false;
        console.log('insert doc: ',doc._id);
    });
}
