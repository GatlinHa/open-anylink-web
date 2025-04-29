/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from 'protobufjs/minimal'

// Common aliases
const $Reader = $protobuf.Reader,
  $Writer = $protobuf.Writer,
  $util = $protobuf.util

// Exported root namespace
const $root = $protobuf.roots['default'] || ($protobuf.roots['default'] = {})

export const Msg = ($root.Msg = (() => {
  /**
   * Properties of a Msg.
   * @exports IMsg
   * @interface IMsg
   * @property {IHeader|null} [header] Msg header
   * @property {IBody|null} [body] Msg body
   * @property {IExtension|null} [extension] Msg extension
   */

  /**
   * Constructs a new Msg.
   * @exports Msg
   * @classdesc Represents a Msg.
   * @implements IMsg
   * @constructor
   * @param {IMsg=} [properties] Properties to set
   */
  function Msg(properties) {
    if (properties)
      for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]]
  }

  /**
   * Msg header.
   * @member {IHeader|null|undefined} header
   * @memberof Msg
   * @instance
   */
  Msg.prototype.header = null

  /**
   * Msg body.
   * @member {IBody|null|undefined} body
   * @memberof Msg
   * @instance
   */
  Msg.prototype.body = null

  /**
   * Msg extension.
   * @member {IExtension|null|undefined} extension
   * @memberof Msg
   * @instance
   */
  Msg.prototype.extension = null

  // OneOf field names bound to virtual getters and setters
  let $oneOfFields

  // Virtual OneOf for proto3 optional field
  Object.defineProperty(Msg.prototype, '_extension', {
    get: $util.oneOfGetter(($oneOfFields = ['extension'])),
    set: $util.oneOfSetter($oneOfFields)
  })

  /**
   * Creates a new Msg instance using the specified properties.
   * @function create
   * @memberof Msg
   * @static
   * @param {IMsg=} [properties] Properties to set
   * @returns {Msg} Msg instance
   */
  Msg.create = function create(properties) {
    return new Msg(properties)
  }

  /**
   * Encodes the specified Msg message. Does not implicitly {@link Msg.verify|verify} messages.
   * @function encode
   * @memberof Msg
   * @static
   * @param {IMsg} message Msg message or plain object to encode
   * @param {$protobuf.Writer} [writer] Writer to encode to
   * @returns {$protobuf.Writer} Writer
   */
  Msg.encode = function encode(message, writer) {
    if (!writer) writer = $Writer.create()
    if (message.header != null && Object.hasOwnProperty.call(message, 'header'))
      $root.Header.encode(message.header, writer.uint32(/* id 1, wireType 2 =*/ 10).fork()).ldelim()
    if (message.body != null && Object.hasOwnProperty.call(message, 'body'))
      $root.Body.encode(message.body, writer.uint32(/* id 2, wireType 2 =*/ 18).fork()).ldelim()
    if (message.extension != null && Object.hasOwnProperty.call(message, 'extension'))
      $root.Extension.encode(
        message.extension,
        writer.uint32(/* id 99, wireType 2 =*/ 794).fork()
      ).ldelim()
    return writer
  }

  /**
   * Encodes the specified Msg message, length delimited. Does not implicitly {@link Msg.verify|verify} messages.
   * @function encodeDelimited
   * @memberof Msg
   * @static
   * @param {IMsg} message Msg message or plain object to encode
   * @param {$protobuf.Writer} [writer] Writer to encode to
   * @returns {$protobuf.Writer} Writer
   */
  Msg.encodeDelimited = function encodeDelimited(message, writer) {
    return this.encode(message, writer).ldelim()
  }

  /**
   * Decodes a Msg message from the specified reader or buffer.
   * @function decode
   * @memberof Msg
   * @static
   * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
   * @param {number} [length] Message length if known beforehand
   * @returns {Msg} Msg
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  Msg.decode = function decode(reader, length) {
    if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
    let end = length === undefined ? reader.len : reader.pos + length,
      message = new $root.Msg()
    while (reader.pos < end) {
      let tag = reader.uint32()
      switch (tag >>> 3) {
        case 1: {
          message.header = $root.Header.decode(reader, reader.uint32())
          break
        }
        case 2: {
          message.body = $root.Body.decode(reader, reader.uint32())
          break
        }
        case 99: {
          message.extension = $root.Extension.decode(reader, reader.uint32())
          break
        }
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  }

  /**
   * Decodes a Msg message from the specified reader or buffer, length delimited.
   * @function decodeDelimited
   * @memberof Msg
   * @static
   * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
   * @returns {Msg} Msg
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  Msg.decodeDelimited = function decodeDelimited(reader) {
    if (!(reader instanceof $Reader)) reader = new $Reader(reader)
    return this.decode(reader, reader.uint32())
  }

  /**
   * Verifies a Msg message.
   * @function verify
   * @memberof Msg
   * @static
   * @param {Object.<string,*>} message Plain object to verify
   * @returns {string|null} `null` if valid, otherwise the reason why it is not
   */
  Msg.verify = function verify(message) {
    if (typeof message !== 'object' || message === null) return 'object expected'
    let properties = {}
    if (message.header != null && message.hasOwnProperty('header')) {
      let error = $root.Header.verify(message.header)
      if (error) return 'header.' + error
    }
    if (message.body != null && message.hasOwnProperty('body')) {
      let error = $root.Body.verify(message.body)
      if (error) return 'body.' + error
    }
    if (message.extension != null && message.hasOwnProperty('extension')) {
      properties._extension = 1
      {
        let error = $root.Extension.verify(message.extension)
        if (error) return 'extension.' + error
      }
    }
    return null
  }

  /**
   * Creates a Msg message from a plain object. Also converts values to their respective internal types.
   * @function fromObject
   * @memberof Msg
   * @static
   * @param {Object.<string,*>} object Plain object
   * @returns {Msg} Msg
   */
  Msg.fromObject = function fromObject(object) {
    if (object instanceof $root.Msg) return object
    let message = new $root.Msg()
    if (object.header != null) {
      if (typeof object.header !== 'object') throw TypeError('.Msg.header: object expected')
      message.header = $root.Header.fromObject(object.header)
    }
    if (object.body != null) {
      if (typeof object.body !== 'object') throw TypeError('.Msg.body: object expected')
      message.body = $root.Body.fromObject(object.body)
    }
    if (object.extension != null) {
      if (typeof object.extension !== 'object') throw TypeError('.Msg.extension: object expected')
      message.extension = $root.Extension.fromObject(object.extension)
    }
    return message
  }

  /**
   * Creates a plain object from a Msg message. Also converts values to other types if specified.
   * @function toObject
   * @memberof Msg
   * @static
   * @param {Msg} message Msg
   * @param {$protobuf.IConversionOptions} [options] Conversion options
   * @returns {Object.<string,*>} Plain object
   */
  Msg.toObject = function toObject(message, options) {
    if (!options) options = {}
    let object = {}
    if (options.defaults) {
      object.header = null
      object.body = null
    }
    if (message.header != null && message.hasOwnProperty('header'))
      object.header = $root.Header.toObject(message.header, options)
    if (message.body != null && message.hasOwnProperty('body'))
      object.body = $root.Body.toObject(message.body, options)
    if (message.extension != null && message.hasOwnProperty('extension')) {
      object.extension = $root.Extension.toObject(message.extension, options)
      if (options.oneofs) object._extension = 'extension'
    }
    return object
  }

  /**
   * Converts this Msg to JSON.
   * @function toJSON
   * @memberof Msg
   * @instance
   * @returns {Object.<string,*>} JSON object
   */
  Msg.prototype.toJSON = function toJSON() {
    return this.constructor.toObject(this, $protobuf.util.toJSONOptions)
  }

  /**
   * Gets the default type url for Msg
   * @function getTypeUrl
   * @memberof Msg
   * @static
   * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
   * @returns {string} The default type url
   */
  Msg.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
    if (typeUrlPrefix === undefined) {
      typeUrlPrefix = 'type.googleapis.com'
    }
    return typeUrlPrefix + '/Msg'
  }

  return Msg
})())

/**
 * MsgType enum.
 * @exports MsgType
 * @enum {number}
 * @property {number} HELLO=0 HELLO value
 * @property {number} HEART_BEAT=1 HEART_BEAT value
 * @property {number} CHAT=2 CHAT value
 * @property {number} GROUP_CHAT=3 GROUP_CHAT value
 * @property {number} CHAT_READ=4 CHAT_READ value
 * @property {number} GROUP_CHAT_READ=5 GROUP_CHAT_READ value
 * @property {number} DELIVERED=6 DELIVERED value
 * @property {number} RESERVE=7 RESERVE value
 * @property {number} STATUS_REQ=8 STATUS_REQ value
 * @property {number} STATUS_RES=9 STATUS_RES value
 * @property {number} STATUS_SYNC=10 STATUS_SYNC value
 * @property {number} AT=11 AT value
 * @property {number} REVOKE=12 REVOKE value
 * @property {number} SYS_GROUP_CREATE=21 SYS_GROUP_CREATE value
 * @property {number} SYS_GROUP_ADD_MEMBER=22 SYS_GROUP_ADD_MEMBER value
 * @property {number} SYS_GROUP_DEL_MEMBER=23 SYS_GROUP_DEL_MEMBER value
 * @property {number} SYS_GROUP_SET_ADMIN=24 SYS_GROUP_SET_ADMIN value
 * @property {number} SYS_GROUP_CANCEL_ADMIN=25 SYS_GROUP_CANCEL_ADMIN value
 * @property {number} SYS_GROUP_SET_ALL_MUTED=26 SYS_GROUP_SET_ALL_MUTED value
 * @property {number} SYS_GROUP_CANCEL_ALL_MUTED=27 SYS_GROUP_CANCEL_ALL_MUTED value
 * @property {number} SYS_GROUP_SET_JOIN_APPROVAL=28 SYS_GROUP_SET_JOIN_APPROVAL value
 * @property {number} SYS_GROUP_CANCEL_JOIN_APPROVAL=29 SYS_GROUP_CANCEL_JOIN_APPROVAL value
 * @property {number} SYS_GROUP_SET_HISTORY_BROWSE=30 SYS_GROUP_SET_HISTORY_BROWSE value
 * @property {number} SYS_GROUP_CANCEL_HISTORY_BROWSE=31 SYS_GROUP_CANCEL_HISTORY_BROWSE value
 * @property {number} SYS_GROUP_OWNER_TRANSFER=32 SYS_GROUP_OWNER_TRANSFER value
 * @property {number} SYS_GROUP_UPDATE_MEMBER_MUTED=33 SYS_GROUP_UPDATE_MEMBER_MUTED value
 * @property {number} SYS_GROUP_LEAVE=34 SYS_GROUP_LEAVE value
 * @property {number} SYS_GROUP_DROP=35 SYS_GROUP_DROP value
 * @property {number} SYS_GROUP_UPDATE_ANNOUNCEMENT=36 SYS_GROUP_UPDATE_ANNOUNCEMENT value
 * @property {number} SYS_GROUP_UPDATE_NAME=37 SYS_GROUP_UPDATE_NAME value
 * @property {number} SYS_GROUP_UPDATE_AVATAR=38 SYS_GROUP_UPDATE_AVATAR value
 * @property {number} CLOSE_BY_READ_IDLE=50 CLOSE_BY_READ_IDLE value
 * @property {number} CLOSE_BY_ERROR_MAGIC=51 CLOSE_BY_ERROR_MAGIC value
 * @property {number} DEFAULT=99 DEFAULT value
 */
export const MsgType = ($root.MsgType = (() => {
  const valuesById = {},
    values = Object.create(valuesById)
  values[(valuesById[0] = 'HELLO')] = 0
  values[(valuesById[1] = 'HEART_BEAT')] = 1
  values[(valuesById[2] = 'CHAT')] = 2
  values[(valuesById[3] = 'GROUP_CHAT')] = 3
  values[(valuesById[4] = 'CHAT_READ')] = 4
  values[(valuesById[5] = 'GROUP_CHAT_READ')] = 5
  values[(valuesById[6] = 'DELIVERED')] = 6
  values[(valuesById[7] = 'RESERVE')] = 7
  values[(valuesById[8] = 'STATUS_REQ')] = 8
  values[(valuesById[9] = 'STATUS_RES')] = 9
  values[(valuesById[10] = 'STATUS_SYNC')] = 10
  values[(valuesById[11] = 'AT')] = 11
  values[(valuesById[12] = 'REVOKE')] = 12
  values[(valuesById[21] = 'SYS_GROUP_CREATE')] = 21
  values[(valuesById[22] = 'SYS_GROUP_ADD_MEMBER')] = 22
  values[(valuesById[23] = 'SYS_GROUP_DEL_MEMBER')] = 23
  values[(valuesById[24] = 'SYS_GROUP_SET_ADMIN')] = 24
  values[(valuesById[25] = 'SYS_GROUP_CANCEL_ADMIN')] = 25
  values[(valuesById[26] = 'SYS_GROUP_SET_ALL_MUTED')] = 26
  values[(valuesById[27] = 'SYS_GROUP_CANCEL_ALL_MUTED')] = 27
  values[(valuesById[28] = 'SYS_GROUP_SET_JOIN_APPROVAL')] = 28
  values[(valuesById[29] = 'SYS_GROUP_CANCEL_JOIN_APPROVAL')] = 29
  values[(valuesById[30] = 'SYS_GROUP_SET_HISTORY_BROWSE')] = 30
  values[(valuesById[31] = 'SYS_GROUP_CANCEL_HISTORY_BROWSE')] = 31
  values[(valuesById[32] = 'SYS_GROUP_OWNER_TRANSFER')] = 32
  values[(valuesById[33] = 'SYS_GROUP_UPDATE_MEMBER_MUTED')] = 33
  values[(valuesById[34] = 'SYS_GROUP_LEAVE')] = 34
  values[(valuesById[35] = 'SYS_GROUP_DROP')] = 35
  values[(valuesById[36] = 'SYS_GROUP_UPDATE_ANNOUNCEMENT')] = 36
  values[(valuesById[37] = 'SYS_GROUP_UPDATE_NAME')] = 37
  values[(valuesById[38] = 'SYS_GROUP_UPDATE_AVATAR')] = 38
  values[(valuesById[50] = 'CLOSE_BY_READ_IDLE')] = 50
  values[(valuesById[51] = 'CLOSE_BY_ERROR_MAGIC')] = 51
  values[(valuesById[99] = 'DEFAULT')] = 99
  return values
})())

export const Header = ($root.Header = (() => {
  /**
   * Properties of a Header.
   * @exports IHeader
   * @interface IHeader
   * @property {number|null} [magic] Header magic
   * @property {number|null} [version] Header version
   * @property {MsgType|null} [msgType] Header msgType
   * @property {boolean|null} [isExtension] Header isExtension
   */

  /**
   * Constructs a new Header.
   * @exports Header
   * @classdesc Represents a Header.
   * @implements IHeader
   * @constructor
   * @param {IHeader=} [properties] Properties to set
   */
  function Header(properties) {
    if (properties)
      for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]]
  }

  /**
   * Header magic.
   * @member {number} magic
   * @memberof Header
   * @instance
   */
  Header.prototype.magic = 0

  /**
   * Header version.
   * @member {number} version
   * @memberof Header
   * @instance
   */
  Header.prototype.version = 0

  /**
   * Header msgType.
   * @member {MsgType} msgType
   * @memberof Header
   * @instance
   */
  Header.prototype.msgType = 0

  /**
   * Header isExtension.
   * @member {boolean} isExtension
   * @memberof Header
   * @instance
   */
  Header.prototype.isExtension = false

  /**
   * Creates a new Header instance using the specified properties.
   * @function create
   * @memberof Header
   * @static
   * @param {IHeader=} [properties] Properties to set
   * @returns {Header} Header instance
   */
  Header.create = function create(properties) {
    return new Header(properties)
  }

  /**
   * Encodes the specified Header message. Does not implicitly {@link Header.verify|verify} messages.
   * @function encode
   * @memberof Header
   * @static
   * @param {IHeader} message Header message or plain object to encode
   * @param {$protobuf.Writer} [writer] Writer to encode to
   * @returns {$protobuf.Writer} Writer
   */
  Header.encode = function encode(message, writer) {
    if (!writer) writer = $Writer.create()
    if (message.magic != null && Object.hasOwnProperty.call(message, 'magic'))
      writer.uint32(/* id 1, wireType 0 =*/ 8).int32(message.magic)
    if (message.version != null && Object.hasOwnProperty.call(message, 'version'))
      writer.uint32(/* id 2, wireType 0 =*/ 16).int32(message.version)
    if (message.msgType != null && Object.hasOwnProperty.call(message, 'msgType'))
      writer.uint32(/* id 3, wireType 0 =*/ 24).int32(message.msgType)
    if (message.isExtension != null && Object.hasOwnProperty.call(message, 'isExtension'))
      writer.uint32(/* id 4, wireType 0 =*/ 32).bool(message.isExtension)
    return writer
  }

  /**
   * Encodes the specified Header message, length delimited. Does not implicitly {@link Header.verify|verify} messages.
   * @function encodeDelimited
   * @memberof Header
   * @static
   * @param {IHeader} message Header message or plain object to encode
   * @param {$protobuf.Writer} [writer] Writer to encode to
   * @returns {$protobuf.Writer} Writer
   */
  Header.encodeDelimited = function encodeDelimited(message, writer) {
    return this.encode(message, writer).ldelim()
  }

  /**
   * Decodes a Header message from the specified reader or buffer.
   * @function decode
   * @memberof Header
   * @static
   * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
   * @param {number} [length] Message length if known beforehand
   * @returns {Header} Header
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  Header.decode = function decode(reader, length) {
    if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
    let end = length === undefined ? reader.len : reader.pos + length,
      message = new $root.Header()
    while (reader.pos < end) {
      let tag = reader.uint32()
      switch (tag >>> 3) {
        case 1: {
          message.magic = reader.int32()
          break
        }
        case 2: {
          message.version = reader.int32()
          break
        }
        case 3: {
          message.msgType = reader.int32()
          break
        }
        case 4: {
          message.isExtension = reader.bool()
          break
        }
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  }

  /**
   * Decodes a Header message from the specified reader or buffer, length delimited.
   * @function decodeDelimited
   * @memberof Header
   * @static
   * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
   * @returns {Header} Header
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  Header.decodeDelimited = function decodeDelimited(reader) {
    if (!(reader instanceof $Reader)) reader = new $Reader(reader)
    return this.decode(reader, reader.uint32())
  }

  /**
   * Verifies a Header message.
   * @function verify
   * @memberof Header
   * @static
   * @param {Object.<string,*>} message Plain object to verify
   * @returns {string|null} `null` if valid, otherwise the reason why it is not
   */
  Header.verify = function verify(message) {
    if (typeof message !== 'object' || message === null) return 'object expected'
    if (message.magic != null && message.hasOwnProperty('magic'))
      if (!$util.isInteger(message.magic)) return 'magic: integer expected'
    if (message.version != null && message.hasOwnProperty('version'))
      if (!$util.isInteger(message.version)) return 'version: integer expected'
    if (message.msgType != null && message.hasOwnProperty('msgType'))
      switch (message.msgType) {
        default:
          return 'msgType: enum value expected'
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
        case 12:
        case 21:
        case 22:
        case 23:
        case 24:
        case 25:
        case 26:
        case 27:
        case 28:
        case 29:
        case 30:
        case 31:
        case 32:
        case 33:
        case 34:
        case 35:
        case 36:
        case 37:
        case 38:
        case 50:
        case 51:
        case 99:
          break
      }
    if (message.isExtension != null && message.hasOwnProperty('isExtension'))
      if (typeof message.isExtension !== 'boolean') return 'isExtension: boolean expected'
    return null
  }

  /**
   * Creates a Header message from a plain object. Also converts values to their respective internal types.
   * @function fromObject
   * @memberof Header
   * @static
   * @param {Object.<string,*>} object Plain object
   * @returns {Header} Header
   */
  Header.fromObject = function fromObject(object) {
    if (object instanceof $root.Header) return object
    let message = new $root.Header()
    if (object.magic != null) message.magic = object.magic | 0
    if (object.version != null) message.version = object.version | 0
    switch (object.msgType) {
      default:
        if (typeof object.msgType === 'number') {
          message.msgType = object.msgType
          break
        }
        break
      case 'HELLO':
      case 0:
        message.msgType = 0
        break
      case 'HEART_BEAT':
      case 1:
        message.msgType = 1
        break
      case 'CHAT':
      case 2:
        message.msgType = 2
        break
      case 'GROUP_CHAT':
      case 3:
        message.msgType = 3
        break
      case 'CHAT_READ':
      case 4:
        message.msgType = 4
        break
      case 'GROUP_CHAT_READ':
      case 5:
        message.msgType = 5
        break
      case 'DELIVERED':
      case 6:
        message.msgType = 6
        break
      case 'RESERVE':
      case 7:
        message.msgType = 7
        break
      case 'STATUS_REQ':
      case 8:
        message.msgType = 8
        break
      case 'STATUS_RES':
      case 9:
        message.msgType = 9
        break
      case 'STATUS_SYNC':
      case 10:
        message.msgType = 10
        break
      case 'AT':
      case 11:
        message.msgType = 11
        break
      case 'REVOKE':
      case 12:
        message.msgType = 12
        break
      case 'SYS_GROUP_CREATE':
      case 21:
        message.msgType = 21
        break
      case 'SYS_GROUP_ADD_MEMBER':
      case 22:
        message.msgType = 22
        break
      case 'SYS_GROUP_DEL_MEMBER':
      case 23:
        message.msgType = 23
        break
      case 'SYS_GROUP_SET_ADMIN':
      case 24:
        message.msgType = 24
        break
      case 'SYS_GROUP_CANCEL_ADMIN':
      case 25:
        message.msgType = 25
        break
      case 'SYS_GROUP_SET_ALL_MUTED':
      case 26:
        message.msgType = 26
        break
      case 'SYS_GROUP_CANCEL_ALL_MUTED':
      case 27:
        message.msgType = 27
        break
      case 'SYS_GROUP_SET_JOIN_APPROVAL':
      case 28:
        message.msgType = 28
        break
      case 'SYS_GROUP_CANCEL_JOIN_APPROVAL':
      case 29:
        message.msgType = 29
        break
      case 'SYS_GROUP_SET_HISTORY_BROWSE':
      case 30:
        message.msgType = 30
        break
      case 'SYS_GROUP_CANCEL_HISTORY_BROWSE':
      case 31:
        message.msgType = 31
        break
      case 'SYS_GROUP_OWNER_TRANSFER':
      case 32:
        message.msgType = 32
        break
      case 'SYS_GROUP_UPDATE_MEMBER_MUTED':
      case 33:
        message.msgType = 33
        break
      case 'SYS_GROUP_LEAVE':
      case 34:
        message.msgType = 34
        break
      case 'SYS_GROUP_DROP':
      case 35:
        message.msgType = 35
        break
      case 'SYS_GROUP_UPDATE_ANNOUNCEMENT':
      case 36:
        message.msgType = 36
        break
      case 'SYS_GROUP_UPDATE_NAME':
      case 37:
        message.msgType = 37
        break
      case 'SYS_GROUP_UPDATE_AVATAR':
      case 38:
        message.msgType = 38
        break
      case 'CLOSE_BY_READ_IDLE':
      case 50:
        message.msgType = 50
        break
      case 'CLOSE_BY_ERROR_MAGIC':
      case 51:
        message.msgType = 51
        break
      case 'DEFAULT':
      case 99:
        message.msgType = 99
        break
    }
    if (object.isExtension != null) message.isExtension = Boolean(object.isExtension)
    return message
  }

  /**
   * Creates a plain object from a Header message. Also converts values to other types if specified.
   * @function toObject
   * @memberof Header
   * @static
   * @param {Header} message Header
   * @param {$protobuf.IConversionOptions} [options] Conversion options
   * @returns {Object.<string,*>} Plain object
   */
  Header.toObject = function toObject(message, options) {
    if (!options) options = {}
    let object = {}
    if (options.defaults) {
      object.magic = 0
      object.version = 0
      object.msgType = options.enums === String ? 'HELLO' : 0
      object.isExtension = false
    }
    if (message.magic != null && message.hasOwnProperty('magic')) object.magic = message.magic
    if (message.version != null && message.hasOwnProperty('version'))
      object.version = message.version
    if (message.msgType != null && message.hasOwnProperty('msgType'))
      object.msgType =
        options.enums === String
          ? $root.MsgType[message.msgType] === undefined
            ? message.msgType
            : $root.MsgType[message.msgType]
          : message.msgType
    if (message.isExtension != null && message.hasOwnProperty('isExtension'))
      object.isExtension = message.isExtension
    return object
  }

  /**
   * Converts this Header to JSON.
   * @function toJSON
   * @memberof Header
   * @instance
   * @returns {Object.<string,*>} JSON object
   */
  Header.prototype.toJSON = function toJSON() {
    return this.constructor.toObject(this, $protobuf.util.toJSONOptions)
  }

  /**
   * Gets the default type url for Header
   * @function getTypeUrl
   * @memberof Header
   * @static
   * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
   * @returns {string} The default type url
   */
  Header.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
    if (typeUrlPrefix === undefined) {
      typeUrlPrefix = 'type.googleapis.com'
    }
    return typeUrlPrefix + '/Header'
  }

  return Header
})())

export const Body = ($root.Body = (() => {
  /**
   * Properties of a Body.
   * @exports IBody
   * @interface IBody
   * @property {string|null} [fromId] Body fromId
   * @property {string|null} [fromClient] Body fromClient
   * @property {string|null} [toId] Body toId
   * @property {string|null} [toClient] Body toClient
   * @property {string|null} [groupId] Body groupId
   * @property {number|Long|null} [msgId] Body msgId
   * @property {string|null} [content] Body content
   * @property {string|null} [seq] Body seq
   * @property {string|null} [sessionId] Body sessionId
   */

  /**
   * Constructs a new Body.
   * @exports Body
   * @classdesc 每种消息需要携带的字段规定：M必须，o非必须，-不带
   * NO      filed      HELLO  HEART_BEAT  CHAT(up)  CHAT(down)  GROUP_CHAT(up)  GROUP_CHAT(down)  CHAT_READ  GROUP_CHAT_READ  DELIVERED  CLOSE_BY_READ_IDLE  CLOSE_BY_ERROR_MAGIC
   * +---+--------------+------+-----------+---------|-----------+---------------+-----------------+----------+----------------+----------+-------------------+---------------------+
   * | 1 | fromId       |   -  |    -      |    M    |     M     |       M       |        M        |     M    |        M       |    -     |       todo        |         todo        |
   * | 2 | fromClient   |   -  |    -      |    M    |     M     |       M       |        M        |     M    |        M       |    -     |       todo        |         todo        |
   * | 3 | toId         |   -  |    -      |    M    |     M     |       -       |        M        |     M    |        O       |    -     |       todo        |         todo        |
   * | 4 | toClient     |   -  |    -      |    -    |     M     |       -       |        M        |     O    |        O       |    -     |       todo        |         todo        |
   * | 5 | groupId      |   -  |    -      |    -    |     -     |       M       |        M        |     -    |        M       |    -     |       todo        |         todo        |
   * | 6 | msgId        |   -  |    -      |    -    |     M     |       -       |        M        |     O    |        O       |    M     |       todo        |         todo        |
   * | 7 | content      |   -  |    -      |    M    |     M     |       M       |        M        |     M    |        M       |    -     |       todo        |         todo        |
   * | 8 | seq          |   -  |    -      |    M    |     M     |       M       |        M        |     O    |        O       |    M     |       todo        |         todo        |
   * | 9 | sessionId    |   -  |    -      |    M    |     M     |       M       |        M        |     M    |        M       |    M     |       todo        |         todo        |
   * +---+--------------+------+-----------+---------|-----------+---------------+-----------------+----------+----------------+----------+-------------------+---------------------+
   * NO      filed      STATUS_REQ   STATUS_RES   STATUS_SYNC  SYS_GROUP_XXX   AT(up)   AT(down)  REVOKE
   * +---+--------------+------------+------------+-------------+------------+---------+---------+-----------+
   * | 1 | fromId       |      M     |      M     |      M      |      -     |    M    |    M    |     M     |
   * | 2 | fromClient   |      M     |      M     |      M      |      -     |    M    |    M    |     -     |
   * | 3 | toId         |      -     |      -     |      -      |      -     |    -    |    M    |     o     |
   * | 4 | toClient     |      -     |      -     |      -      |      -     |    -    |    M    |     -     |
   * | 5 | groupId      |      -     |      -     |      -      |      M     |    M    |    M    |     o     |
   * | 6 | msgId        |      -     |      -     |      -      |      M     |    -    |    M    |     M     |
   * | 7 | content      |      M     |      M     |      M      |      M     |    M    |    M    |     M     |
   * | 8 | seq          |      -     |      -     |      -      |      -     |    M    |    M    |     -     |
   * | 9 | sessionId    |      -     |      -     |      -      |      M     |    M    |    M    |     M     |
   * +---+--------------+------------+------------+-------------+------------+---------+---------+-----------+
   * @implements IBody
   * @constructor
   * @param {IBody=} [properties] Properties to set
   */
  function Body(properties) {
    if (properties)
      for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]]
  }

  /**
   * Body fromId.
   * @member {string|null|undefined} fromId
   * @memberof Body
   * @instance
   */
  Body.prototype.fromId = null

  /**
   * Body fromClient.
   * @member {string|null|undefined} fromClient
   * @memberof Body
   * @instance
   */
  Body.prototype.fromClient = null

  /**
   * Body toId.
   * @member {string|null|undefined} toId
   * @memberof Body
   * @instance
   */
  Body.prototype.toId = null

  /**
   * Body toClient.
   * @member {string|null|undefined} toClient
   * @memberof Body
   * @instance
   */
  Body.prototype.toClient = null

  /**
   * Body groupId.
   * @member {string|null|undefined} groupId
   * @memberof Body
   * @instance
   */
  Body.prototype.groupId = null

  /**
   * Body msgId.
   * @member {number|Long|null|undefined} msgId
   * @memberof Body
   * @instance
   */
  Body.prototype.msgId = null

  /**
   * Body content.
   * @member {string|null|undefined} content
   * @memberof Body
   * @instance
   */
  Body.prototype.content = null

  /**
   * Body seq.
   * @member {string|null|undefined} seq
   * @memberof Body
   * @instance
   */
  Body.prototype.seq = null

  /**
   * Body sessionId.
   * @member {string|null|undefined} sessionId
   * @memberof Body
   * @instance
   */
  Body.prototype.sessionId = null

  // OneOf field names bound to virtual getters and setters
  let $oneOfFields

  // Virtual OneOf for proto3 optional field
  Object.defineProperty(Body.prototype, '_fromId', {
    get: $util.oneOfGetter(($oneOfFields = ['fromId'])),
    set: $util.oneOfSetter($oneOfFields)
  })

  // Virtual OneOf for proto3 optional field
  Object.defineProperty(Body.prototype, '_fromClient', {
    get: $util.oneOfGetter(($oneOfFields = ['fromClient'])),
    set: $util.oneOfSetter($oneOfFields)
  })

  // Virtual OneOf for proto3 optional field
  Object.defineProperty(Body.prototype, '_toId', {
    get: $util.oneOfGetter(($oneOfFields = ['toId'])),
    set: $util.oneOfSetter($oneOfFields)
  })

  // Virtual OneOf for proto3 optional field
  Object.defineProperty(Body.prototype, '_toClient', {
    get: $util.oneOfGetter(($oneOfFields = ['toClient'])),
    set: $util.oneOfSetter($oneOfFields)
  })

  // Virtual OneOf for proto3 optional field
  Object.defineProperty(Body.prototype, '_groupId', {
    get: $util.oneOfGetter(($oneOfFields = ['groupId'])),
    set: $util.oneOfSetter($oneOfFields)
  })

  // Virtual OneOf for proto3 optional field
  Object.defineProperty(Body.prototype, '_msgId', {
    get: $util.oneOfGetter(($oneOfFields = ['msgId'])),
    set: $util.oneOfSetter($oneOfFields)
  })

  // Virtual OneOf for proto3 optional field
  Object.defineProperty(Body.prototype, '_content', {
    get: $util.oneOfGetter(($oneOfFields = ['content'])),
    set: $util.oneOfSetter($oneOfFields)
  })

  // Virtual OneOf for proto3 optional field
  Object.defineProperty(Body.prototype, '_seq', {
    get: $util.oneOfGetter(($oneOfFields = ['seq'])),
    set: $util.oneOfSetter($oneOfFields)
  })

  // Virtual OneOf for proto3 optional field
  Object.defineProperty(Body.prototype, '_sessionId', {
    get: $util.oneOfGetter(($oneOfFields = ['sessionId'])),
    set: $util.oneOfSetter($oneOfFields)
  })

  /**
   * Creates a new Body instance using the specified properties.
   * @function create
   * @memberof Body
   * @static
   * @param {IBody=} [properties] Properties to set
   * @returns {Body} Body instance
   */
  Body.create = function create(properties) {
    return new Body(properties)
  }

  /**
   * Encodes the specified Body message. Does not implicitly {@link Body.verify|verify} messages.
   * @function encode
   * @memberof Body
   * @static
   * @param {IBody} message Body message or plain object to encode
   * @param {$protobuf.Writer} [writer] Writer to encode to
   * @returns {$protobuf.Writer} Writer
   */
  Body.encode = function encode(message, writer) {
    if (!writer) writer = $Writer.create()
    if (message.fromId != null && Object.hasOwnProperty.call(message, 'fromId'))
      writer.uint32(/* id 1, wireType 2 =*/ 10).string(message.fromId)
    if (message.fromClient != null && Object.hasOwnProperty.call(message, 'fromClient'))
      writer.uint32(/* id 2, wireType 2 =*/ 18).string(message.fromClient)
    if (message.toId != null && Object.hasOwnProperty.call(message, 'toId'))
      writer.uint32(/* id 3, wireType 2 =*/ 26).string(message.toId)
    if (message.toClient != null && Object.hasOwnProperty.call(message, 'toClient'))
      writer.uint32(/* id 4, wireType 2 =*/ 34).string(message.toClient)
    if (message.groupId != null && Object.hasOwnProperty.call(message, 'groupId'))
      writer.uint32(/* id 5, wireType 2 =*/ 42).string(message.groupId)
    if (message.msgId != null && Object.hasOwnProperty.call(message, 'msgId'))
      writer.uint32(/* id 6, wireType 0 =*/ 48).int64(message.msgId)
    if (message.content != null && Object.hasOwnProperty.call(message, 'content'))
      writer.uint32(/* id 7, wireType 2 =*/ 58).string(message.content)
    if (message.seq != null && Object.hasOwnProperty.call(message, 'seq'))
      writer.uint32(/* id 8, wireType 2 =*/ 66).string(message.seq)
    if (message.sessionId != null && Object.hasOwnProperty.call(message, 'sessionId'))
      writer.uint32(/* id 9, wireType 2 =*/ 74).string(message.sessionId)
    return writer
  }

  /**
   * Encodes the specified Body message, length delimited. Does not implicitly {@link Body.verify|verify} messages.
   * @function encodeDelimited
   * @memberof Body
   * @static
   * @param {IBody} message Body message or plain object to encode
   * @param {$protobuf.Writer} [writer] Writer to encode to
   * @returns {$protobuf.Writer} Writer
   */
  Body.encodeDelimited = function encodeDelimited(message, writer) {
    return this.encode(message, writer).ldelim()
  }

  /**
   * Decodes a Body message from the specified reader or buffer.
   * @function decode
   * @memberof Body
   * @static
   * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
   * @param {number} [length] Message length if known beforehand
   * @returns {Body} Body
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  Body.decode = function decode(reader, length) {
    if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
    let end = length === undefined ? reader.len : reader.pos + length,
      message = new $root.Body()
    while (reader.pos < end) {
      let tag = reader.uint32()
      switch (tag >>> 3) {
        case 1: {
          message.fromId = reader.string()
          break
        }
        case 2: {
          message.fromClient = reader.string()
          break
        }
        case 3: {
          message.toId = reader.string()
          break
        }
        case 4: {
          message.toClient = reader.string()
          break
        }
        case 5: {
          message.groupId = reader.string()
          break
        }
        case 6: {
          message.msgId = reader.int64()
          break
        }
        case 7: {
          message.content = reader.string()
          break
        }
        case 8: {
          message.seq = reader.string()
          break
        }
        case 9: {
          message.sessionId = reader.string()
          break
        }
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  }

  /**
   * Decodes a Body message from the specified reader or buffer, length delimited.
   * @function decodeDelimited
   * @memberof Body
   * @static
   * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
   * @returns {Body} Body
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  Body.decodeDelimited = function decodeDelimited(reader) {
    if (!(reader instanceof $Reader)) reader = new $Reader(reader)
    return this.decode(reader, reader.uint32())
  }

  /**
   * Verifies a Body message.
   * @function verify
   * @memberof Body
   * @static
   * @param {Object.<string,*>} message Plain object to verify
   * @returns {string|null} `null` if valid, otherwise the reason why it is not
   */
  Body.verify = function verify(message) {
    if (typeof message !== 'object' || message === null) return 'object expected'
    let properties = {}
    if (message.fromId != null && message.hasOwnProperty('fromId')) {
      properties._fromId = 1
      if (!$util.isString(message.fromId)) return 'fromId: string expected'
    }
    if (message.fromClient != null && message.hasOwnProperty('fromClient')) {
      properties._fromClient = 1
      if (!$util.isString(message.fromClient)) return 'fromClient: string expected'
    }
    if (message.toId != null && message.hasOwnProperty('toId')) {
      properties._toId = 1
      if (!$util.isString(message.toId)) return 'toId: string expected'
    }
    if (message.toClient != null && message.hasOwnProperty('toClient')) {
      properties._toClient = 1
      if (!$util.isString(message.toClient)) return 'toClient: string expected'
    }
    if (message.groupId != null && message.hasOwnProperty('groupId')) {
      properties._groupId = 1
      if (!$util.isString(message.groupId)) return 'groupId: string expected'
    }
    if (message.msgId != null && message.hasOwnProperty('msgId')) {
      properties._msgId = 1
      if (
        !$util.isInteger(message.msgId) &&
        !(
          message.msgId &&
          $util.isInteger(message.msgId.low) &&
          $util.isInteger(message.msgId.high)
        )
      )
        return 'msgId: integer|Long expected'
    }
    if (message.content != null && message.hasOwnProperty('content')) {
      properties._content = 1
      if (!$util.isString(message.content)) return 'content: string expected'
    }
    if (message.seq != null && message.hasOwnProperty('seq')) {
      properties._seq = 1
      if (!$util.isString(message.seq)) return 'seq: string expected'
    }
    if (message.sessionId != null && message.hasOwnProperty('sessionId')) {
      properties._sessionId = 1
      if (!$util.isString(message.sessionId)) return 'sessionId: string expected'
    }
    return null
  }

  /**
   * Creates a Body message from a plain object. Also converts values to their respective internal types.
   * @function fromObject
   * @memberof Body
   * @static
   * @param {Object.<string,*>} object Plain object
   * @returns {Body} Body
   */
  Body.fromObject = function fromObject(object) {
    if (object instanceof $root.Body) return object
    let message = new $root.Body()
    if (object.fromId != null) message.fromId = String(object.fromId)
    if (object.fromClient != null) message.fromClient = String(object.fromClient)
    if (object.toId != null) message.toId = String(object.toId)
    if (object.toClient != null) message.toClient = String(object.toClient)
    if (object.groupId != null) message.groupId = String(object.groupId)
    if (object.msgId != null)
      if ($util.Long) (message.msgId = $util.Long.fromValue(object.msgId)).unsigned = false
      else if (typeof object.msgId === 'string') message.msgId = parseInt(object.msgId, 10)
      else if (typeof object.msgId === 'number') message.msgId = object.msgId
      else if (typeof object.msgId === 'object')
        message.msgId = new $util.LongBits(
          object.msgId.low >>> 0,
          object.msgId.high >>> 0
        ).toNumber()
    if (object.content != null) message.content = String(object.content)
    if (object.seq != null) message.seq = String(object.seq)
    if (object.sessionId != null) message.sessionId = String(object.sessionId)
    return message
  }

  /**
   * Creates a plain object from a Body message. Also converts values to other types if specified.
   * @function toObject
   * @memberof Body
   * @static
   * @param {Body} message Body
   * @param {$protobuf.IConversionOptions} [options] Conversion options
   * @returns {Object.<string,*>} Plain object
   */
  Body.toObject = function toObject(message, options) {
    if (!options) options = {}
    let object = {}
    if (message.fromId != null && message.hasOwnProperty('fromId')) {
      object.fromId = message.fromId
      if (options.oneofs) object._fromId = 'fromId'
    }
    if (message.fromClient != null && message.hasOwnProperty('fromClient')) {
      object.fromClient = message.fromClient
      if (options.oneofs) object._fromClient = 'fromClient'
    }
    if (message.toId != null && message.hasOwnProperty('toId')) {
      object.toId = message.toId
      if (options.oneofs) object._toId = 'toId'
    }
    if (message.toClient != null && message.hasOwnProperty('toClient')) {
      object.toClient = message.toClient
      if (options.oneofs) object._toClient = 'toClient'
    }
    if (message.groupId != null && message.hasOwnProperty('groupId')) {
      object.groupId = message.groupId
      if (options.oneofs) object._groupId = 'groupId'
    }
    if (message.msgId != null && message.hasOwnProperty('msgId')) {
      if (typeof message.msgId === 'number')
        object.msgId = options.longs === String ? String(message.msgId) : message.msgId
      else
        object.msgId =
          options.longs === String
            ? $util.Long.prototype.toString.call(message.msgId)
            : options.longs === Number
              ? new $util.LongBits(message.msgId.low >>> 0, message.msgId.high >>> 0).toNumber()
              : message.msgId
      if (options.oneofs) object._msgId = 'msgId'
    }
    if (message.content != null && message.hasOwnProperty('content')) {
      object.content = message.content
      if (options.oneofs) object._content = 'content'
    }
    if (message.seq != null && message.hasOwnProperty('seq')) {
      object.seq = message.seq
      if (options.oneofs) object._seq = 'seq'
    }
    if (message.sessionId != null && message.hasOwnProperty('sessionId')) {
      object.sessionId = message.sessionId
      if (options.oneofs) object._sessionId = 'sessionId'
    }
    return object
  }

  /**
   * Converts this Body to JSON.
   * @function toJSON
   * @memberof Body
   * @instance
   * @returns {Object.<string,*>} JSON object
   */
  Body.prototype.toJSON = function toJSON() {
    return this.constructor.toObject(this, $protobuf.util.toJSONOptions)
  }

  /**
   * Gets the default type url for Body
   * @function getTypeUrl
   * @memberof Body
   * @static
   * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
   * @returns {string} The default type url
   */
  Body.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
    if (typeUrlPrefix === undefined) {
      typeUrlPrefix = 'type.googleapis.com'
    }
    return typeUrlPrefix + '/Body'
  }

  return Body
})())

export const Extension = ($root.Extension = (() => {
  /**
   * Properties of an Extension.
   * @exports IExtension
   * @interface IExtension
   * @property {Object.<string,string>|null} [extensionMap] Extension extensionMap
   */

  /**
   * Constructs a new Extension.
   * @exports Extension
   * @classdesc Represents an Extension.
   * @implements IExtension
   * @constructor
   * @param {IExtension=} [properties] Properties to set
   */
  function Extension(properties) {
    this.extensionMap = {}
    if (properties)
      for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
        if (properties[keys[i]] != null) this[keys[i]] = properties[keys[i]]
  }

  /**
   * Extension extensionMap.
   * @member {Object.<string,string>} extensionMap
   * @memberof Extension
   * @instance
   */
  Extension.prototype.extensionMap = $util.emptyObject

  /**
   * Creates a new Extension instance using the specified properties.
   * @function create
   * @memberof Extension
   * @static
   * @param {IExtension=} [properties] Properties to set
   * @returns {Extension} Extension instance
   */
  Extension.create = function create(properties) {
    return new Extension(properties)
  }

  /**
   * Encodes the specified Extension message. Does not implicitly {@link Extension.verify|verify} messages.
   * @function encode
   * @memberof Extension
   * @static
   * @param {IExtension} message Extension message or plain object to encode
   * @param {$protobuf.Writer} [writer] Writer to encode to
   * @returns {$protobuf.Writer} Writer
   */
  Extension.encode = function encode(message, writer) {
    if (!writer) writer = $Writer.create()
    if (message.extensionMap != null && Object.hasOwnProperty.call(message, 'extensionMap'))
      for (let keys = Object.keys(message.extensionMap), i = 0; i < keys.length; ++i)
        writer
          .uint32(/* id 1, wireType 2 =*/ 10)
          .fork()
          .uint32(/* id 1, wireType 2 =*/ 10)
          .string(keys[i])
          .uint32(/* id 2, wireType 2 =*/ 18)
          .string(message.extensionMap[keys[i]])
          .ldelim()
    return writer
  }

  /**
   * Encodes the specified Extension message, length delimited. Does not implicitly {@link Extension.verify|verify} messages.
   * @function encodeDelimited
   * @memberof Extension
   * @static
   * @param {IExtension} message Extension message or plain object to encode
   * @param {$protobuf.Writer} [writer] Writer to encode to
   * @returns {$protobuf.Writer} Writer
   */
  Extension.encodeDelimited = function encodeDelimited(message, writer) {
    return this.encode(message, writer).ldelim()
  }

  /**
   * Decodes an Extension message from the specified reader or buffer.
   * @function decode
   * @memberof Extension
   * @static
   * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
   * @param {number} [length] Message length if known beforehand
   * @returns {Extension} Extension
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  Extension.decode = function decode(reader, length) {
    if (!(reader instanceof $Reader)) reader = $Reader.create(reader)
    let end = length === undefined ? reader.len : reader.pos + length,
      message = new $root.Extension(),
      key,
      value
    while (reader.pos < end) {
      let tag = reader.uint32()
      switch (tag >>> 3) {
        case 1: {
          if (message.extensionMap === $util.emptyObject) message.extensionMap = {}
          let end2 = reader.uint32() + reader.pos
          key = ''
          value = ''
          while (reader.pos < end2) {
            let tag2 = reader.uint32()
            switch (tag2 >>> 3) {
              case 1:
                key = reader.string()
                break
              case 2:
                value = reader.string()
                break
              default:
                reader.skipType(tag2 & 7)
                break
            }
          }
          message.extensionMap[key] = value
          break
        }
        default:
          reader.skipType(tag & 7)
          break
      }
    }
    return message
  }

  /**
   * Decodes an Extension message from the specified reader or buffer, length delimited.
   * @function decodeDelimited
   * @memberof Extension
   * @static
   * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
   * @returns {Extension} Extension
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  Extension.decodeDelimited = function decodeDelimited(reader) {
    if (!(reader instanceof $Reader)) reader = new $Reader(reader)
    return this.decode(reader, reader.uint32())
  }

  /**
   * Verifies an Extension message.
   * @function verify
   * @memberof Extension
   * @static
   * @param {Object.<string,*>} message Plain object to verify
   * @returns {string|null} `null` if valid, otherwise the reason why it is not
   */
  Extension.verify = function verify(message) {
    if (typeof message !== 'object' || message === null) return 'object expected'
    if (message.extensionMap != null && message.hasOwnProperty('extensionMap')) {
      if (!$util.isObject(message.extensionMap)) return 'extensionMap: object expected'
      let key = Object.keys(message.extensionMap)
      for (let i = 0; i < key.length; ++i)
        if (!$util.isString(message.extensionMap[key[i]]))
          return 'extensionMap: string{k:string} expected'
    }
    return null
  }

  /**
   * Creates an Extension message from a plain object. Also converts values to their respective internal types.
   * @function fromObject
   * @memberof Extension
   * @static
   * @param {Object.<string,*>} object Plain object
   * @returns {Extension} Extension
   */
  Extension.fromObject = function fromObject(object) {
    if (object instanceof $root.Extension) return object
    let message = new $root.Extension()
    if (object.extensionMap) {
      if (typeof object.extensionMap !== 'object')
        throw TypeError('.Extension.extensionMap: object expected')
      message.extensionMap = {}
      for (let keys = Object.keys(object.extensionMap), i = 0; i < keys.length; ++i)
        message.extensionMap[keys[i]] = String(object.extensionMap[keys[i]])
    }
    return message
  }

  /**
   * Creates a plain object from an Extension message. Also converts values to other types if specified.
   * @function toObject
   * @memberof Extension
   * @static
   * @param {Extension} message Extension
   * @param {$protobuf.IConversionOptions} [options] Conversion options
   * @returns {Object.<string,*>} Plain object
   */
  Extension.toObject = function toObject(message, options) {
    if (!options) options = {}
    let object = {}
    if (options.objects || options.defaults) object.extensionMap = {}
    let keys2
    if (message.extensionMap && (keys2 = Object.keys(message.extensionMap)).length) {
      object.extensionMap = {}
      for (let j = 0; j < keys2.length; ++j)
        object.extensionMap[keys2[j]] = message.extensionMap[keys2[j]]
    }
    return object
  }

  /**
   * Converts this Extension to JSON.
   * @function toJSON
   * @memberof Extension
   * @instance
   * @returns {Object.<string,*>} JSON object
   */
  Extension.prototype.toJSON = function toJSON() {
    return this.constructor.toObject(this, $protobuf.util.toJSONOptions)
  }

  /**
   * Gets the default type url for Extension
   * @function getTypeUrl
   * @memberof Extension
   * @static
   * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
   * @returns {string} The default type url
   */
  Extension.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
    if (typeUrlPrefix === undefined) {
      typeUrlPrefix = 'type.googleapis.com'
    }
    return typeUrlPrefix + '/Extension'
  }

  return Extension
})())

export { $root as default }
