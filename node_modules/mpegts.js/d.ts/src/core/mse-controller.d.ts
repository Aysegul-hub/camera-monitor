export default MSEController;
declare class MSEController {
    constructor(config: any);
    TAG: string;
    _config: any;
    _emitter: any;
    e: {
        onSourceOpen: any;
        onSourceEnded: any;
        onSourceClose: any;
        onStartStreaming: any;
        onEndStreaming: any;
        onQualityChange: any;
        onSourceBufferError: any;
        onSourceBufferUpdateEnd: any;
    };
    _useManagedMediaSource: boolean;
    _mediaSource: any;
    _mediaSourceObjectURL: string;
    _mediaElementProxy: any;
    _isBufferFull: boolean;
    _hasPendingEos: boolean;
    _requireSetMediaDuration: boolean;
    _pendingMediaDuration: number;
    _pendingSourceBufferInit: any[];
    _mimeTypes: {
        video: any;
        audio: any;
    };
    _sourceBuffers: {
        video: any;
        audio: any;
    };
    _lastInitSegments: {
        video: any;
        audio: any;
    };
    _pendingSegments: {
        video: any[];
        audio: any[];
    };
    _pendingRemoveRanges: {
        video: any[];
        audio: any[];
    };
    destroy(): void;
    on(event: any, listener: any): void;
    off(event: any, listener: any): void;
    initialize(mediaElementProxy: any): void;
    shutdown(): void;
    isManagedMediaSource(): boolean;
    getObject(): any;
    getHandle(): any;
    getObjectURL(): string;
    revokeObjectURL(): void;
    appendInitSegment(initSegment: any, deferred?: any): void;
    appendMediaSegment(mediaSegment: any): void;
    flush(): void;
    endOfStream(): void;
    _needCleanupSourceBuffer(): boolean;
    _doCleanupSourceBuffer(): void;
    _updateMediaSourceDuration(): void;
    _doRemoveRanges(): void;
    _doAppendSegments(): void;
    _onSourceOpen(): void;
    _onStartStreaming(): void;
    _onEndStreaming(): void;
    _onQualityChange(): void;
    _onSourceEnded(): void;
    _onSourceClose(): void;
    _hasPendingSegments(): boolean;
    _hasPendingRemoveRanges(): boolean;
    _onSourceBufferUpdateEnd(): void;
    _onSourceBufferError(e: any): void;
}
