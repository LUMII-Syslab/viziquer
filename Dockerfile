FROM johnnyutahio/meteor-launchpad

# WORKDIR /the/workdir/path
# COPY app/private/jsons /opt/meteor/dist/bundle/jsons
COPY app/private/jsons /opt/meteor/dist/bundle/private/jsons
