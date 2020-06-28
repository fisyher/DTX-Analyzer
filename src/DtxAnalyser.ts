import * as fs from "fs"
import { DtxJson2} from "./DtxJson2Type"


export class DTXAnalyzer {

    private dtxJson: DtxJson2;

    static readonly handNoteTypes: string[] = ['LeftCrashCymbal', 
    'Hi-Hat', 'Snare', 'Hi-Tom', 'Low-Tom', 'Floor-Tom', 'RightCrashCymbal', 'RideCymbal']
    static readonly feetNoteTypes: string[] = ['LeftBassPedal', 'RightBassPedal']
    static readonly allNoteTypes: string[] = ['LeftCrashCymbal', 
    'Hi-Hat', 'Snare', 'Hi-Tom', 'Low-Tom', 'Floor-Tom', 'RightCrashCymbal', 'RideCymbal', 'LeftBassPedal', 'RightBassPedal']

    constructor(inDtxJson: DtxJson2) {
        this.dtxJson = inDtxJson
    }

    /**
     * Export bar-specific analytics data in csv
     * @param outFilePath 
     */
    public exportDataAsCSV(outFilePath: string){
        
        let outputString: string = ""

        //Headers
        outputString += "Bar No.,Start Time,Duration,Hand Notes,Hits per second,Feet Notes,Steps per second,All Notes,Notes per second\r\n"
        
        for (let i = 0; i < this.dtxJson.bars.length; i++) {
            const barData = this.dtxJson.bars[i];
            
            //Export bar Number and TimeInMs
            outputString += i
            outputString += ','
            outputString += (barData.startTimePos * 1000).toFixed(0)
            outputString += ','
            outputString += (barData.duration * 1000).toFixed(0)
            outputString += ','

            //TODO: more columns in future
            outputString += this.noteCountInBar(i, DTXAnalyzer.handNoteTypes)
            outputString += ','
            outputString += this.densityInBar(i, DTXAnalyzer.handNoteTypes).toFixed(3)
            outputString += ','
            outputString += this.noteCountInBar(i, DTXAnalyzer.feetNoteTypes)
            outputString += ','
            outputString += this.densityInBar(i, DTXAnalyzer.feetNoteTypes).toFixed(3)
            outputString += ','
            outputString += this.noteCountInBar(i, DTXAnalyzer.allNoteTypes)
            outputString += ','
            outputString += this.densityInBar(i, DTXAnalyzer.allNoteTypes).toFixed(3)

            outputString += '\r\n'
        }

        //Total overall stats
        outputString += 'Overall'
        outputString += ','
        outputString += '0'
        outputString += ','
        outputString += (this.dtxJson.miscData.songDuration * 1000).toFixed(0)
        outputString += ','

        outputString += this.totalNotesOfType(DTXAnalyzer.handNoteTypes)
        outputString += ','
        outputString += this.overallDensity(this.dtxJson.miscData.songDuration, DTXAnalyzer.handNoteTypes)
        outputString += ','
        outputString += this.totalNotesOfType(DTXAnalyzer.feetNoteTypes)
        outputString += ','
        outputString += this.overallDensity(this.dtxJson.miscData.songDuration, DTXAnalyzer.feetNoteTypes)
        outputString += ','
        outputString += this.totalNotesOfType(DTXAnalyzer.allNoteTypes)
        outputString += ','
        outputString += this.overallDensity(this.dtxJson.miscData.songDuration, DTXAnalyzer.allNoteTypes)
        
        outputString += '\r\n'

        try {
            fs.writeFileSync(outFilePath, outputString)
        } catch (error) {
            console.error("Cannot write to filepath ", outFilePath);
        }
    }

    /**
     * 
     * @param songDuration 
     * @param types 
     */
    public overallDensity(songDuration: number, types: string[]) : number {
        let density: number = 0
        try {            
            const totalNoteCountOfTypes : number = this.totalNotesOfType(types)
            density = totalNoteCountOfTypes / songDuration

        } catch (error) {
            console.error(error)            
            density = 0
        }
        
        return density
    }

    /**
     * 
     * @param barNum 
     * @param types Array of selected types of notes
     * @returns Density of notes of all selected types within a given bar. Density is number of notes per second
     */
    public densityInBar(barNum: number, types: string[]) : number {
        let density: number = 0
        try {
            const barDuration : number = this.dtxJson.bars[barNum].duration
            const barNoteCountOfType : number = this.noteCountInBar(barNum, types)
            density = barNoteCountOfType / barDuration

        } catch (error) {
            console.error(error)            
            density = 0
        }
        
        return density
    }


    /* Methods for note count for various categories */
    public totalNotesOfType(types: string[]): number{
        let count: number = 0

        for (let index = 0; index < this.dtxJson.bars.length; index++) {
            count += this.noteCountInBar(index, types)            
        }

        return count
    }    

    /**
     * Basic query function, get number of notes in a specified bar and types
     * 
     * @param barNum 
     * @param types - An array of types selected
     */
    public noteCountInBar(barNum: number, types: string[]): number{
        let count: number = 0

        try {

            for (let index = 0; index < types.length; index++) {
                const type = types[index];
                count += this.dtxJson.chips[barNum][type].length   
            }
                        
        } catch (error) {
            console.error(error)
            count = 0
        }

        return count
    }


}