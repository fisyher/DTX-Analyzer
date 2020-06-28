import * as fs from "fs"
import * as iconv from "iconv-lite";
import { DtxJson2, LaneBarChipsData, BarData, BpmSegment } from "../src/DtxJson2Type"

const TITLE_TAG:string = "#TITLE"
const LINES_IN_1_BAR: number = 192

 //Intermediate interfaces
interface BarLength {
    barNum: number,
    barLength: number
}

interface ChipItem {
    barNum: number,
    lineNum: number,
    chipCode: string
}

interface BarLaneItem {
    barNum: number,
    laneCode: string,
    value: string
}

interface BpmMarker {
    bpm: number,
    barNum: number,
    lineNum: number
}

export class DtxFileParser {
    
    private path: string = "";
    private barLengths: number[] = [];
    private bpmMarkers: BpmMarker[] = [];
    private finalJson: DtxJson2 = {
        miscData: {
            title: '',
            artist: '',
            comment: '',
            difficultyLevelDrum: 0,
            difficultyLevelGuitar: 0,
            difficultyLevelBass: 0,
            songDuration: 0
        },
        bars: [],
        bpmSegments: [],
        chips: []
    };
    //private dtxcontent: string = "";
    //private dtxContentLines: Array<string> = [];
    //private dtxobject: object;

    /**
     * Opens a DTX file and converts to internal JSON format
     * @param filePath 
     */
    
    constructor(filePath: string) {
        this.path = filePath;
        console.log(this.path)
        
        let dataBuffer;
        try {
            dataBuffer = fs.readFileSync(filePath)
        } catch (error) {
            console.error("Cannot open filepath ", filePath);
            return;
        }
        
        //All dtx files has #TITLE tag
        let content = iconv.decode(dataBuffer, "Shift-JIS")
        if(content.indexOf(TITLE_TAG) === -1){
            console.error("Has no #TITLE tag!")
            return;
        }

        //Main Data

        //Get highest bar number
        let highestBarNumber: number = this.extractHighestBarNumber(content)

        //Get bar lengths of ALL bars
        this.barLengths = this.extractBarLengths(content, highestBarNumber)
        
        //console.log(this.barLengths)
        //Get bpm markers array
        this.bpmMarkers = this.extractBpmMarkers(content, this.barLengths)
        //console.log(this.bpmMarkers)

        /**
         * After obtaining barlengths and bpmMarkers data, it is now possible to calculate absolute time 
         * for any given bar-line number for this dtx
         */
        //
        try {
            const songDuration : number = this.calculateAbsoluteTime(highestBarNumber + 1, 0)
            console.log("Song Duration is calculated to be ", songDuration, " seconds")

            this.finalJson.miscData.title = this.extractMiscField(content, "TITLE")
            this.finalJson.miscData.artist = this.extractMiscField(content, "ARTIST")
            this.finalJson.miscData.comment = this.extractMiscField(content, "COMMENT")
            this.finalJson.miscData.difficultyLevelDrum = this.convertDtxDiffLevelToGitadoraLevel(this.extractMiscField(content, "DLEVEL"))
            this.finalJson.miscData.difficultyLevelGuitar = this.convertDtxDiffLevelToGitadoraLevel(this.extractMiscField(content, "GLEVEL"))
            this.finalJson.miscData.difficultyLevelBass = this.convertDtxDiffLevelToGitadoraLevel(this.extractMiscField(content, "BLEVEL"))
            this.finalJson.miscData.songDuration = songDuration

            const barDataArray : BarData[] = this.createBarDataArray()
            this.finalJson.bars = barDataArray

            const bpmSegmentArray : BpmSegment[] = this.createBpmSegmentArray(songDuration)
            this.finalJson.bpmSegments = bpmSegmentArray

            const laneBarChipsArray : LaneBarChipsData[] = this.extractAndCreateLaneChipsArray(content)
            this.finalJson.chips = laneBarChipsArray
            //
        } catch (error) {
            console.error("Exception occurred: ", error)
            return;
        }
    }

    /**
     * getDtxJson2
     */
    public getDtxJson2() : DtxJson2 {
        return this.finalJson
    }

    public saveAsJsonFile(outpath: string){
        try {
            fs.writeFileSync(outpath, JSON.stringify(this.finalJson))
        } catch (error) {
            console.error("Cannot write to filepath ", outpath);
        }
    }

    private extractAndCreateLaneChipsArray (dtxContent: string) : LaneBarChipsData[] {
        let barChipsArray : LaneBarChipsData[] = []

        for (let index = 0; index < this.barLengths.length; index++) {
            
            let currBarChips : LaneBarChipsData = {

            }

            /**
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
            currBarChips['BGM'] = this.extractChipsFromLanesInBar(dtxContent, index, ['01'])
            currBarChips['LeftCrashCymbal'] = this.extractChipsFromLanesInBar(dtxContent, index, ['1A'])
            currBarChips['Hi-Hat'] = this.extractChipsFromLanesInBar(dtxContent, index, ['11', '18'])
            currBarChips['Snare'] = this.extractChipsFromLanesInBar(dtxContent, index, ['12'])
            currBarChips['LeftBassPedal'] = this.extractChipsFromLanesInBar(dtxContent, index, ['1B', '1C'])
            currBarChips['Hi-Tom'] = this.extractChipsFromLanesInBar(dtxContent, index, ['14'])
            currBarChips['RightBassPedal'] = this.extractChipsFromLanesInBar(dtxContent, index, ['13'])
            currBarChips['Low-Tom'] = this.extractChipsFromLanesInBar(dtxContent, index, ['15'])
            currBarChips['Floor-Tom'] = this.extractChipsFromLanesInBar(dtxContent, index, ['17'])
            currBarChips['RightCrashCymbal'] = this.extractChipsFromLanesInBar(dtxContent, index, ['16'])
            currBarChips['RideCymbal'] = this.extractChipsFromLanesInBar(dtxContent, index, ['19'])
            
            barChipsArray.push(currBarChips)
            
        }

        return barChipsArray
    }

    /**
     * 
     * @param songDuration 
     */
    private createBpmSegmentArray (songDuration: number) : BpmSegment[] {
        let bpmSegments: BpmSegment[] = []

        for (let index = 0; index < this.bpmMarkers.length; index++) {
            const bpmMarker = this.bpmMarkers[index];

            const currBPMSegment: BpmSegment = {
                bpm: bpmMarker.bpm,
                startBarNum: bpmMarker.barNum,
                startLineNum: bpmMarker.lineNum,
                startTimePos: this.calculateAbsoluteTime(bpmMarker.barNum, bpmMarker.lineNum),
                duration: 0.0
            }
            
            //Update previous segment duration
            if(index > 0){
                bpmSegments[index - 1].duration = currBPMSegment.startTimePos - bpmSegments[index - 1].startTimePos
            }

            //For last bpmSegment use song duration to compute its duration
            if(index === this.bpmMarkers.length - 1){
                currBPMSegment.duration = songDuration - currBPMSegment.startTimePos
            }
            
            bpmSegments.push(currBPMSegment)
        }

        return bpmSegments;
    }

    private createBarDataArray () : BarData[] {
        let barDataArray: BarData[] = []

        const arraySize: number = this.barLengths.length + 1

        for (let index = 0; index < arraySize; index++) {
            
            const currBarData : BarData = {
                lineCount: index < (arraySize - 1) ? this.barLengths[index] * LINES_IN_1_BAR : 0,
                startTimePos: this.calculateAbsoluteTime(index, 0),
                duration: 0
            }

            //Update duration of previous barData using current BarData startTimePos
            if(index > 0){
                barDataArray[index - 1].duration = currBarData.startTimePos - barDataArray[index - 1].startTimePos
            }           
            
            if(index < (arraySize - 1))
            {
                barDataArray.push(currBarData)
            }
            
        }

        return barDataArray

    }

    /**
     * 
     * @param barNum 
     * @param line 
     * @returns The absolute time position of given bar-line position for the current dtx, or -1 if bar or line has invalid value
     * @requires barLengths and bpmMarkers must be pre-computed before this method can be used
     */
    private calculateAbsoluteTime(barNum: number, line: number) : number{

        //Validity check
        if(barNum < 0 || line < 0){
            console.error("Invalid negative values found for barNum or line")
            return -1
        }
        const currBarLength : number = barNum >= this.barLengths.length ? 1.0 : this.barLengths[barNum];
        const currBarLineCount: number = currBarLength * LINES_IN_1_BAR
        if(line >= currBarLineCount){
            console.error("line cannot be greater or equal to currBarLineCount")
            return -1
        }

        //Default bpm is stored in bpmMarkers[0]        
        let currBpm : number = this.bpmMarkers[0].bpm
        //Start with next index
        let currBpmMarkerIndex : number = 1
        let currTimePos: number = 0.0
        for (let index = 0; index < barNum + 1; index++) {
            //Okay for barNum to be above upper bound, just assume barlength is 1 after last bar
            const currBarLength : number = index >= this.barLengths.length ? 1.0 : this.barLengths[index];
            const currBarLineCount : number = currBarLength * LINES_IN_1_BAR
            
            //
            let currLineUpperBound : number = currBarLineCount
            if(index === barNum){
                currLineUpperBound = line
            }
            
            let currLineNum : number = 0; // 0 to (max line count in bar - 1)
            //
            let bpmMarkerFound: boolean = false
            //Search for all bpmMarkers within current bar in ascending order
            do {
                //Accumulate time for each bpm segment
                if(currBpmMarkerIndex < this.bpmMarkers.length && 
                    this.bpmMarkers[currBpmMarkerIndex].barNum === index && 
                    this.bpmMarkers[currBpmMarkerIndex].lineNum <= currLineUpperBound ){
                    
                    /**
                     * BPM - Beats per min -> Quarter-beats 1/4 per min
                     * -> mins per beat (1/4) -> 1/bpm
                     * -> seconds per beat (1/4) -> (60/bpm)
                     * -> seconds per 1/192th line -> (60/bpm/48) -> 1.25/bpm 
                     */
                    const secondsPerLine = 1.25 / currBpm
                    let durationInCurrBlock : number = (this.bpmMarkers[currBpmMarkerIndex].lineNum - currLineNum) * secondsPerLine
                    currTimePos += durationInCurrBlock

                    //Update variables
                    bpmMarkerFound = true
                    currBpm = this.bpmMarkers[currBpmMarkerIndex].bpm 
                    currLineNum = this.bpmMarkers[currBpmMarkerIndex].lineNum
                    currBpmMarkerIndex++ 
                      
                }
                else{
                    bpmMarkerFound = false
                }
            } while (bpmMarkerFound);

            //calculate for remaining segment
            const secondsPerLine = 1.25 / currBpm
            const durationInRemainingBlock : number = (currLineUpperBound - currLineNum) * secondsPerLine 
            currTimePos += durationInRemainingBlock
        }

        return currTimePos;
    }
    
    private extractMiscField(dtxContent:string, fieldName:string) : string {
        let retString: string = ""

        let regExpChip : RegExp = new RegExp('#' + fieldName + ':? \\S*')
        let matchResult = regExpChip.exec(dtxContent)
        if(matchResult){
            const keyValueString = this.splitIntoKeyValuePair(matchResult[0])
            if(keyValueString){
                retString = keyValueString[1]
            }
        }

        return retString
    }

    /**
     * 
     * @param dtxContent 
     * @param barNum 
     * @param laneCodes 
     */
    private extractChipsFromLanesInBar(dtxContent:string, barNum: number, laneCodes: string[]) : {lineNum: number,
        timePosition: number, chipCode: string}[] {

            let retArray : {lineNum: number, timePosition: number, chipCode: string}[] = []
            const currBarLength : number = this.barLengths[barNum]

            for (let index = 0; index < laneCodes.length; index++) {
                const laneCode : string = laneCodes[index];
                
                const barNumIn3Char : string = barNum.toString().padStart(3, '0')
                //console.log(barNumIn3Char)
                
                let regExpChip : RegExp = new RegExp('#' + barNumIn3Char + laneCode + ':? \\S*', 'g') // /#\d{3}02:? \S*/g
                //console.log(regExpChip)

                let chip_matchResults = [];
                let matchResult = null;
                while ( (matchResult = regExpChip.exec(dtxContent)) != null) {
                    chip_matchResults.push(matchResult);
                }

                chip_matchResults.forEach(element => {
                    let matchedBarLaneItem : BarLaneItem | null = this.decodeLineData(element[0])
                    if(matchedBarLaneItem){
                        const chipsItemArray : ChipItem[] =  this.decodeBarItem(matchedBarLaneItem.value, 
                            currBarLength, matchedBarLaneItem.barNum)
                        for (let j = 0; j < chipsItemArray.length; j++) {
                            const element = chipsItemArray[j];
                            
                            retArray.push({
                                lineNum: element.lineNum,
                                timePosition: this.calculateAbsoluteTime(element.barNum, element.lineNum),
                                chipCode: element.chipCode
                            })
                        }    
                    }
                    
                });
            }

            return retArray
        }

    private extractHighestBarNumber(dtxContent:string) : number {
        let highestBarNum: number = 0

        let chip_matchResults = [];
        //Search content with regexp for chip position data
        //Lane 02 is excluded because they are not chip data but bar length
        let regExpChip : RegExp = new RegExp(/#\d{3}(?!02)\w{2}:? \S*/g)
        let matchResult = null;
        while ( (matchResult = regExpChip.exec(dtxContent)) != null) {
            chip_matchResults.push(matchResult);
        }

        //console.log(chip_matchResults)        

        let chipLine_objects = [];
        chip_matchResults.forEach(element => {
            let line_object = this.decodeLineData(element[0])
            if (line_object !== null) {
                chipLine_objects.push(line_object)
                if(line_object.barNum > highestBarNum){
                    highestBarNum = line_object.barNum
                }
            }
        });

        //At this point highestBar number is found
        console.log("Highest bar number is ", highestBarNum)

        return highestBarNum;
    }

    private extractBarLengths(dtxContent:string, highestBarNumber: number) : number[] {
        let barLengths: number[] = []

        //Barlength related: Match only lane 02        
        let barLength_matchResults = [];
        let matchResult = null;
        let regExpBarLength : RegExp = new RegExp(/#\d{3}02:? \S*/g)
        while ( (matchResult = regExpBarLength.exec(dtxContent)) != null) {
            barLength_matchResults.push(matchResult);
        }

        //Convert to JSON array of BarLength[]
        let barLengthMarkerArray: BarLength[] = []
        barLength_matchResults.forEach(element => {
            let barLength_Item: BarLaneItem | null = this.decodeLineData(element[0])
            
            if(barLength_Item){
                barLengthMarkerArray.push({
                    barNum: barLength_Item.barNum,
                    barLength: parseFloat(barLength_Item.value)
                })
            }
        });

        //Walkthrough all bars
        let currBarLength: number = 1.0
        let currMarkerIndex: number = 0
        let barCount: number = highestBarNumber + 1
        for (let i = 0; i < barCount; i++) {
            //Check if current bar length has a bar length marker
            if(currMarkerIndex < barLengthMarkerArray.length && 
                i == barLengthMarkerArray[currMarkerIndex].barNum){
                currBarLength = barLengthMarkerArray[currMarkerIndex].barLength
                currMarkerIndex++
            }
            barLengths.push(currBarLength)            
        }
        //Test
        //console.log(this.extractBpmMarkers)
        //console.log(barLengths)
        return barLengths;
    }

    /**
     * 
     * @param dtxContent 
     * @param barLengths 
     * @returns Array of BpmMarker, in ascending order of bar-line number
     */
    private extractBpmMarkers(dtxContent:string, barLengths: number[]) : BpmMarker[] {
        let bpmMarkerArray: BpmMarker[] = []
        
        try {
            //Get the initial BPM value from metadata
            let matchResult = dtxContent.match(/#BPM:? \S*/)
            let startBpm: number = 0
            if(matchResult){
                let bpmValue = this.splitIntoKeyValuePair(matchResult[0])
                if(bpmValue){
                    startBpm = parseFloat(bpmValue[1])
                }                
            }
            else{
                throw "Match not found!"
            }

            //Default bpm is equivalent to a bpmMarker at bar:0 line:0
            bpmMarkerArray.push({
                bpm: startBpm,
                barNum: 0,
                lineNum: 0
            })
            
            //BPM marker data
            let regExpBPMMarker : RegExp = new RegExp(/#BPM[A-Z0-9]{2}:? \S*/g)
            let BPMMarker_matchResults = [];
            while ( (matchResult = regExpBPMMarker.exec(dtxContent)) != null) {
                BPMMarker_matchResults.push(matchResult);
            }

            /**
             * Create the bpmLabelMap
             * #BPM02: 80
                #BPM03: 160
                #BPM04: 144
             */
            if(BPMMarker_matchResults.length > 0){
                let bpmLabelMap: any = {}
                BPMMarker_matchResults.forEach(element => {
                    let bpmLabelValue = this.splitIntoKeyValuePair(element[0])
                    if(bpmLabelValue){
                        let label:string = bpmLabelValue[0].substring(4, 6)
                        let bpmValue: Number = parseFloat(bpmLabelValue[1])
                        //console.log('bpm value is ', bpmValue)
                        bpmLabelMap[label] = bpmValue
                    }                    
                });

                //BPM Lane data
                //Barlength related: Match only lane 08
                let matchResult = null;
                let BPMLane_matchResults = [];

                let regExpBarLength : RegExp = new RegExp(/#\d{3}08:? \S*/g)
                while ( (matchResult = regExpBarLength.exec(dtxContent)) != null) {
                    BPMLane_matchResults.push(matchResult);
                }

                BPMLane_matchResults.forEach(element => {                    
                    let BPMLaneBarItem : BarLaneItem | null = this.decodeLineData(element[0])                    
                    if(BPMLaneBarItem){
                        let currBarLength: number = barLengths[BPMLaneBarItem.barNum]
                        let currBarBPMMarkerChipsArray: ChipItem[] = this.decodeBarItem(BPMLaneBarItem.value, 
                            currBarLength, BPMLaneBarItem.barNum)

                        for (let index = 0; index < currBarBPMMarkerChipsArray.length; index++) {
                            const element = currBarBPMMarkerChipsArray[index];
                            if(element.barNum === 0 && element.lineNum === 0){
                                //Overwrite default if a bpm marker is found at bar 0 and line 0
                                bpmMarkerArray[0].bpm = bpmLabelMap[element.chipCode] as number
                            }
                            else{
                                bpmMarkerArray.push({
                                    bpm: bpmLabelMap[element.chipCode] as number,
                                    barNum: element.barNum,
                                    lineNum: element.lineNum
                                })
                            }
                            
                        }
                    }
                    
                });

                //TODO: Need to ensure bpmMarkerArray is in ascending order of bar-line number
                //For now we assume it is already in ascending order from dtx content
            }


        } catch (error) {
            
        }
        

        return bpmMarkerArray;
    }

    /**
     * 
     * @param encodedValue 
     * @param barLength 
     * @param barNum 
     */
    private decodeBarItem(encodedValue: string, barLength: number, barNum: number) : ChipItem[]{
        let totalLineCountForCurrBar: number = 192 * barLength
        let outputChips: ChipItem[] = []

        let chipsArray: RegExpMatchArray | null = encodedValue.match(/.{1,2}/g);
        if(chipsArray){
            for (let index = 0; index < chipsArray.length; index++) {
                const element = chipsArray[index];
                if(element !== '00'){
                    let linePos:number = index*totalLineCountForCurrBar/chipsArray.length;
                    
                    outputChips.push({
                        barNum: barNum,
                        lineNum: linePos,
                        chipCode: element
                    });
                }
            }
        }
        
        return outputChips
    }

    /**
     * 
     * @param inputLine 
     */
    private splitIntoKeyValuePair(inputLine:string) : string[] | null {
        let trimmedLine:string = this.trimExternalWhiteSpace(inputLine)
        let keyValue = trimmedLine.split(/:(.+)?/,2);
			if(keyValue.length !== 2){
				keyValue = trimmedLine.split(/\s(.+)?/,2);
            }
        
        if(keyValue.length !== 2){
            console.error('Error splitting!')
            return null;
        }
        return keyValue;
    }

    /**
     * 
     * @param inputLine - A Line Item with Bar and Lane code
     * @returns A BarLaneItem or null
     */
    private decodeLineData(inputLine:string) : BarLaneItem | null {
        let keyValue = this.splitIntoKeyValuePair(inputLine)

        if(keyValue){
            let barNum:number = parseInt(keyValue[0].substring(1, 4))
            let laneCode:string = keyValue[0].substring(4, 6)
            let outvalue:string = this.trimExternalWhiteSpace(keyValue[1])
            return {
                "barNum": barNum,
                "laneCode": laneCode,
                "value": outvalue
            }
        }
        else{
            return null
        }        

    }

    private convertDtxDiffLevelToGitadoraLevel(inputValue: string): number {
        try {
            let diffNumber = parseInt(inputValue) || 0
            if(diffNumber >= 100){
                diffNumber = diffNumber / 100
            }
            else{
                diffNumber = diffNumber / 10
            }
            return diffNumber
        } catch (error) {
            return 0
        }
        
    }

    private trimExternalWhiteSpace(inputLine:string) : string{
		
		return inputLine.replace(/^\s+|\s+$/g, '');
		
	}
}