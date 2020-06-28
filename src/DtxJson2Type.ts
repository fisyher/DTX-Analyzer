
/**
 * Output JSON format
 * {
 * songDuration: number,
 * metadata: {
 * 
 * }
 * 
 * bars:[ 
 *  {
 *      lineCount: Number,
 *      startTimePos: Number,
 *      duration: Number      
 *  } ...
 * ]
 * bpmSegments:[
 * {
 *  bpm: Number,
 *  startBarNum: Number,
 *  startLineNum: Number,
 *  startTimePos: Number,
 *  duration: Number
 * } ...
 * ]
 * chips: 
 * [ // barNum: Number
 * {
 *   [type: string]: [
 *   {      
 *      lineNum: Number
 *      timePosition: Number
 *   }
 *   ],
 *   [type: string]: [ // Next type of chips
 *   {
 *      lineNum: Number
 *      timePosition: Number
 *   }
 *   ]
 *   
 * }, ... Next Bar
 * ]
 * 
 * }
 * 
 * 
 */
export interface DtxJson2 {
    miscData: MiscDtxData,
    bars: BarData[],
    bpmSegments: BpmSegment[],
    chips: LaneBarChipsData[]
}

 //
 export interface MiscDtxData {
    title: string,
    artist: string,
    comment: string,
    difficultyLevelDrum: number,
    difficultyLevelGuitar: number,
    difficultyLevelBass: number,
    songDuration: number
 }

/**
 * Collection of chips for all types of lane within a bar.
 * Valid types include:
 * BGM
 * LeftCrashCymbal
 * Hi-Hat
 * Snare
 * LeftBassPedal
 * Hi-Tom
 * RightBassPedal
 * Low-Tom
 * Floor-Tom
 * RightCrashCymbal
 * RideCymbal
 */ 
export interface LaneBarChipsData {
    [type: string]: {
        lineNum: number,
        timePosition: number
        chipCode : string
    }[]
}

/**
 * 
 */
export interface BarData {
    lineCount: number,
    startTimePos: number,
    duration: number  
}

export interface BpmSegment {
    bpm: number,
    startBarNum: number,
    startLineNum: number,
    startTimePos: number,
    duration: number
}