import { DtxFileParser } from "./DtxFileParser"
import { DTXAnalyzer } from "./DtxAnalyser"
import { ArgumentParser } from "argparse"

//
let myArgParser = new ArgumentParser({
    version: '0.0.1',
    addHelp:true,
    description: 'DTX Statistics Analyser. Generates a CSV file that contains various statistics such as startTime, Duration, Note Count per Bar for the input DTX file'
})

myArgParser.addArgument(
    ['-i', '--input'],
    {
        help: "Input DTX File",
        required : true
    }
)

myArgParser.addArgument(
    ['-o', '--output'],
    {
        help: "Output CSV File containing statistical data for input DTX",
        required: true
    }
)

myArgParser.addArgument(
    ['-j', '--json'],
    {
        help: "The output path for the intermediate JSON file"
    }
)

let args = myArgParser.parseArgs();
console.log(args);

let dtxParser = new DtxFileParser(args.input);
if(args.json){
    dtxParser.saveAsJsonFile(args.json)
}
let analyser = new DTXAnalyzer(dtxParser.getDtxJson2())
analyser.exportDataAsCSV(args.output)



