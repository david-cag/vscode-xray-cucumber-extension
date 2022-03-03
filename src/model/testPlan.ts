import { Feature } from "./feature";

export class TestPlan {
    key: string;
    name: string;
    features: Feature[] | undefined;

    constructor(key : string, name : string){
        this.key = key;
        this.name = name;
    }
}