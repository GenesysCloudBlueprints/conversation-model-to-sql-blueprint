import _ from 'lodash';
import { Client } from 'pg';
import config from './config';

const client = new Client(config.postgreSQL);

// Table Names
const CONVERSATIONS = 'conversations';
const PARTICIPANTS = 'participants';
const SESSIONS = 'sessions';
const SEGMENTS = 'segments';    
const METRICS = 'metrics';

// Create Queries
const CREATE_CONVERSATIONS_TABLE_QUERY = `
CREATE TABLE IF NOT EXISTS ${CONVERSATIONS}(
    conversation_id                      CHAR(36) NOT NULL,
    conversation_start                   VARCHAR NOT NULL,
    conversation_end                     VARCHAR,
    media_stats_min_conversation_mos     DECIMAL,
    media_stats_min_conversation_rfactor DECIMAL,
    originating_direction                VARCHAR NOT NULL,
    division_ids                         VARCHAR,
    PRIMARY KEY(conversation_id)
 );
`;

const CREATE_PARTICIPANTS_TABLE_QUERY = `
CREATE TABLE IF NOT EXISTS ${PARTICIPANTS}(
    participant_id        CHAR(36) NOT NULL,
    conversation_id       CHAR(36) NOT NULL,
    participant_name      VARCHAR,
    purpose               VARCHAR NOT NULL,
    user_id               CHAR(36),
    PRIMARY KEY(participant_id),
    CONSTRAINT conversation_id_fk
        FOREIGN KEY(conversation_id) 
            REFERENCES ${CONVERSATIONS}(conversation_id)
 );
`;

const CREATE_SESSIONS_TABLE_QUERY = `
CREATE TABLE IF NOT EXISTS ${SESSIONS}(
    session_id         CHAR(36) NOT NULL,
    participant_id     CHAR(36) NOT NULL,
    media_type         VARCHAR NOT NULL,
    direction          VARCHAR NOT NULL,
    peer_id            CHAR(36),
    provider           VARCHAR NOT NULL,
    requested_routings VARCHAR,
    used_routing       VARCHAR,
    selected_agent_id  CHAR(36),
    remote             VARCHAR,
    PRIMARY KEY(session_id),
    CONSTRAINT participant_id_fk
        FOREIGN KEY(participant_id) 
            REFERENCES ${PARTICIPANTS}(participant_id)
 );
`;

// segment_id is session_id + _ + segment_start + _ + segment_end
const CREATE_SEGMENTS_TABLE_QUERY = `
CREATE TABLE IF NOT EXISTS ${SEGMENTS}(
    segment_id      VARCHAR NOT NULL,
    session_id      CHAR(36) NOT NULL,
    segment_start   VARCHAR NOT NULL,
    segment_end     VARCHAR NOT NULL,
    segment_type    VARCHAR NOT NULL,
    conference      BOOLEAN NOT NULL,
    disconnect_type VARCHAR,
    queue_id        CHAR(36),
    PRIMARY KEY(segment_id),
    CONSTRAINT session_id_fk
        FOREIGN KEY(session_id) 
            REFERENCES ${SESSIONS}(session_id)
);

`;
// metric_id is session_id + _ + name + _ + value
const CREATE_METRICS_TABLE_QUERY = `
CREATE TABLE IF NOT EXISTS ${METRICS}(
    metric_id  VARCHAR NOT NULL,
    session_id CHAR(36) NOT NULL,
    name       VARCHAR NOT NULL,
    value      BIGINT NOT NULL,
    emit_date  VARCHAR NOT NULL,
    PRIMARY KEY(metric_id),
    CONSTRAINT session_id_fk
        FOREIGN KEY(session_id) 
            REFERENCES ${SESSIONS}(session_id)
);
`;

// Insertion Queries
const INSERT_CONVERSATIONS_TABLE_QUERY = `
INSERT INTO ${CONVERSATIONS}(conversation_id, conversation_start, conversation_end, originating_direction, division_ids, media_stats_min_conversation_mos, media_stats_min_conversation_rfactor) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *
`;

const INSERT_PARTICIPANTS_TABLE_QUERY = `
INSERT INTO ${PARTICIPANTS}(participant_id, conversation_id, participant_name, purpose, user_id) VALUES($1, $2, $3, $4, $5) RETURNING *
`;

const INSERT_SESSIONS_TABLE_QUERY = `
INSERT INTO ${SESSIONS}(session_id, participant_id, media_type, direction, peer_id, provider, requested_routings, used_routing, selected_agent_id, remote) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
`;

const INSERT_SEGMENTS_TABLE_QUERY = `
INSERT INTO ${SEGMENTS}(segment_id, session_id, segment_start, segment_end, segment_type, conference, disconnect_type, queue_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
`;

const INSERT_METRICS_TABLE_QUERY = `
INSERT INTO ${METRICS}(metric_id, session_id, name, value, emit_date) VALUES($1, $2, $3, $4, $5) RETURNING *
`;

// Fetch queries
const FETCH_CONVERSATION_QUERY = `
SELECT * FROM ${CONVERSATIONS}
    INNER JOIN ${PARTICIPANTS} ON ${CONVERSATIONS}.conversation_id=${PARTICIPANTS}.conversation_id
    INNER JOIN ${SESSIONS} ON ${PARTICIPANTS}.participant_id=${SESSIONS}.participant_id
    INNER JOIN ${SEGMENTS} ON ${SESSIONS}.session_id=${SEGMENTS}.session_id
    INNER JOIN ${METRICS} ON ${SESSIONS}.session_id=${METRICS}.session_id WHERE ${CONVERSATIONS}.conversation_id = $1
`;

const createTable = async (creationQuery: string, tableName: string) => {
    const created = await client.query(creationQuery);
    if (created) console.log(`'${tableName}' table created successfully`);
};

const insertData = async (insertionQuery: string, values: any[]) => {
    await client.query(insertionQuery, values);
};

const fetchData = async (fetchQuery: string, id: any[]) => {
  const fetched = await client.query(fetchQuery, id);
  if (fetched.rows[0]) return fetched.rows;
  else console.log(`no data available with key \'${id}\'`);
};

const dropTable = async (tableName: string, ifExists: boolean) => {
  const command = ifExists ? 'DROP TABLE IF EXISTS' : 'DROP TABLE';
  const dropped = await client.query(`${command} ${tableName}`);
  if (dropped) console.log(`\'${tableName}\' table dropped successfully`);
};

// Removes null and undefined properties from an object
function clean(obj: any) {
  var propNames = Object.getOwnPropertyNames(obj);
  for (var i = 0; i < propNames.length; i++) {
    var propName = propNames[i];
    if (obj[propName] === null || obj[propName] === undefined) {
      delete obj[propName];
    }
  }
  return obj;
}

// Generates conversation objects from database rows
function generateConversation(data: any[]) {
  return {
    conversationId: data[0].conversation_id,
    conversationStart: data[0].conversation_start,
    conversationEnd: data[0].conversation_end,
    originatingDirection: data[0].originating_direction,
    divisionIds: data[0].division_ids ? data[0].division_ids.split(',') : null,
    mediaStatsMinConversationMos: data[0].media_stats_min_conversation_mos ? Number(data[0].media_stats_min_conversation_mos) : null,
    mediaStatsMinConversationRFactor:
    data[0].media_stats_min_conversation_rfactor ? Number(data[0].media_stats_min_conversation_rfactor) : null,
    participants: generateParticipants(data),
  };
}

// Generates participant objects from database rows
function generateParticipants(rows: any[]) {
  var participants = [];
  _.forEach(rows, function (row) {
    var results = _.filter(participants, function (item) {
      return item.participantId.indexOf(row.participant_id) > -1;
    });
    if (results.length > 0) return;
    participants.push(
      clean({
        participantId: row.participant_id,
        participantName: row.participant_name,
        purpose: row.purpose,
        userId: row.user_id,
        sessions: generateSessions(rows, row.participant_id),
      })
    );
  });
  return participants;
}

// Generates session objects from database rows
function generateSessions(rows: any[], participantId: string) {
  var sessions = [];
  _.forEach(rows, function (row) {
    if (row.participant_id !== participantId) return;
    var results = _.filter(sessions, function (item) {
      return item.sessionId.indexOf(row.session_id) > -1;
    });
    if (results.length > 0) return;
    sessions.push(
      clean({
        mediaType: row.media_type,
        sessionId: row.session_id,
        direction: row.direction,
        provider: row.provider,
        requestedRoutings: row.requested_routings ? row.requested_routings.split(',') : null,
        usedRouting: row.used_routing,
        selectedAgentId: row.selected_agent_id,
        peerId: row.peer_id,
        remote: row.remote,
        segments: generateSegments(rows, row.session_id),
        metrics: generateMetrics(rows, row.session_id),
      })
    );
  });
  return sessions;
}

// Generates segment objects from database rows
function generateSegments(rows: any[], sessionId: string) {
  var segments = [];
  var segmentIds = [];
  _.forEach(rows, function (row) {
    if (row.session_id !== sessionId) return;
    const segmentId = `${row.session_id}_${row.segment_start}_${row.segment_end}`;
    if (segmentIds.includes(segmentId)) return;
    segmentIds.push(segmentId);
    segments.push(
      clean({
        segmentStart: row.segment_start,
        segmentEnd: row.segment_end,
        queueId: row.queue_id,
        disconnectType: row.disconnect_type,
        segmentType: row.segment_type,
        conference: row.conference,
      })
    );
  });
  return segments;
}

// Generates metric objects from database rows
function generateMetrics(rows: any[], sessionId: string) {
  var metrics = [];
  var metricIds = [];
  _.forEach(rows, function (row) {
    if (row.session_id !== sessionId) return;
    const metricId = `${row.session_id}_${row.name}`;
    if (metricIds.includes(metricId)) return;
    metricIds.push(metricId);
    metrics.push(
      clean({
        name: row.name,
        value: Number(row.value),
        emitDate: row.emit_date,
      })
    );
  });
  return metrics;
}

/*
  Exported functions
*/

export const createTables = async () => {
  await createTable(CREATE_CONVERSATIONS_TABLE_QUERY, CONVERSATIONS);
  await createTable(CREATE_PARTICIPANTS_TABLE_QUERY, PARTICIPANTS);
  await createTable(CREATE_SESSIONS_TABLE_QUERY, SESSIONS);
  await createTable(CREATE_SEGMENTS_TABLE_QUERY, SEGMENTS);
  await createTable(CREATE_METRICS_TABLE_QUERY, METRICS);
};

export const dropTables = async () => {
  await dropTable(METRICS, true);
  await dropTable(SEGMENTS, true);
  await dropTable(SESSIONS, true);
  await dropTable(PARTICIPANTS, true);
  await dropTable(CONVERSATIONS, true);
};

export const fetchConversation = async (conversationId: string) => {
  const fetched = await fetchData(FETCH_CONVERSATION_QUERY, [conversationId]);
  if (!fetched) return null;

  var conversation = generateConversation(fetched);
  return clean(conversation);
};

export const insertConversation = async (conversation: any) => {
  try {
    // Insert top-level conversation data
    await client.query('BEGIN');
    await insertData(INSERT_CONVERSATIONS_TABLE_QUERY, [
      conversation.conversationId,
      conversation.conversationStart,
      conversation.conversationEnd,
      conversation.originatingDirection,
      conversation.divisionIds ? conversation.divisionIds.join(','): null,
      conversation.mediaStatsMinConversationMos,
      conversation.mediaStatsMinConversationRFactor,
    ]);
    for (const participant of conversation.participants) {
      // Insert top-level participant data
      await insertData(INSERT_PARTICIPANTS_TABLE_QUERY, [
        participant.participantId,
        conversation.conversationId,
        participant.participantName,
        participant.purpose,
        participant.userId,
      ]);
      for (const session of participant.sessions) {
        // Insert session data
        await insertData(INSERT_SESSIONS_TABLE_QUERY, [
          session.sessionId,
          participant.participantId,
          session.mediaType,
          session.direction,
          session.peerId,
          session.provider,
          session.requestedRoutings ? session.requestedRoutings.join(','): null,
          session.usedRouting,
          session.selectedAgentId,
          session.remote,
        ]);
        for (const segment of session.segments) {
          const segmentId = `${session.sessionId}_${segment.segmentStart}_${segment.segmentEnd}`;
          // Insert segment data
          await insertData(INSERT_SEGMENTS_TABLE_QUERY, [
            segmentId,
            session.sessionId,
            segment.segmentStart,
            segment.segmentEnd,
            segment.segmentType,
            segment.conference,
            segment.disconnectType,
            segment.queueId,
          ]);
        }
        for (const metric of session.metrics) {
          const metricId = `${session.sessionId}_${metric.name}_${metric.value}`;
          // Insert metric data
          await insertData(INSERT_METRICS_TABLE_QUERY, [
            metricId,
            session.sessionId,
            metric.name,
            metric.value,
            metric.emitDate,
          ]);
        }
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.log(`Error inserting conversation with ID: ${conversation.conversationId}`);
    throw err;
  }
};

export const connectDB = async () => {
  await client.connect();
};
