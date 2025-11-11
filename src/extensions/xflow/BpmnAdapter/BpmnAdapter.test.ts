import path from "path";
import fs from "fs";
import { describe, it, expect } from "@jest/globals";
import {
  convertFromXPMNToBPMN,
  convertFromBPMNToXPMN,
  formatOptions,
} from "./BpmnAdapter";
import xmlFormatter from "xml-formatter";

describe("BpmnAdapter", () => {
  it("should convert bpmn xml to xpmn xml", () => {
    // 从 samples/bpmn.xml 中读取 bpmn xml，转化为 xpmn，其内容需与 samples/xpmn.xml 一致
    const bpmnxml = fs.readFileSync(
      path.join(__dirname, "samples", "bpmn.xml"),
      "utf8"
    );
    const expectedXpmnXml = xmlFormatter(
      fs.readFileSync(path.join(__dirname, "samples", "xpmn.xml"), "utf8"),
      formatOptions
    );
    const xpmnxml = convertFromBPMNToXPMN(bpmnxml);
    fs.writeFileSync(
      path.join(__dirname, "samples", "xpmn-received.xml"),
      xpmnxml
    );

    expect(xpmnxml).toEqual(expectedXpmnXml);
  });
  it("should convert xpmn xml to bpmn xml", () => {
    // 从 samples/xpmn.xml 中读取 xpmn xml，转化为 bpmn，其内容需与 samples/bpmn.xml 一致
    const xpmnxml = fs.readFileSync(
      path.join(__dirname, "samples", "xpmn.xml"),
      "utf8"
    );
    const expectedBpmnXml = xmlFormatter(
      fs.readFileSync(path.join(__dirname, "samples", "bpmn.xml"), "utf8"),
      formatOptions
    );
    const bpmnxml = convertFromXPMNToBPMN(xpmnxml);
    fs.writeFileSync(
      path.join(__dirname, "samples", "bpmn-received.xml"),
      bpmnxml
    );

    expect(bpmnxml).toEqual(expectedBpmnXml);
  });
  
  it("should case.bpmn to case.xpmn", () => {
    // 从 samples/case.bpmn 中读取 bpmn xml，转化为 xpmn，验证所有 BPMNDiagram 都被转换
    const bpmnxml = fs.readFileSync(
      path.join(__dirname, "samples", "case.bpmn"),
      "utf8"
    );
    const expectedXPmnXml = xmlFormatter(
      fs.readFileSync(path.join(__dirname, "samples", "case.xpmn"), "utf8"),
      formatOptions
    );
    const xpmnxml = convertFromBPMNToXPMN(bpmnxml);
    
    // 保存生成的 XPMN 文件
    fs.writeFileSync(
      path.join(__dirname, "samples", "case-received.xpmn"),
      xpmnxml
    );
    
    expect(xpmnxml).toBe(expectedXPmnXml);
  });
  
  it("should convert case.xpmn to case.bpmn", () => {
    // 从 samples/case.xpmn 中读取 xpmn xml，转化为 bpmn，其内容需与 samples/case.bpmn 一致
    const xpmnxml = fs.readFileSync(
      path.join(__dirname, "samples", "case.xpmn"),
      "utf8"
    );
    const expectedBpmnXml = xmlFormatter(
      fs.readFileSync(path.join(__dirname, "samples", "case.bpmn"), "utf8"),
      formatOptions
    );
    const bpmnxml = convertFromXPMNToBPMN(xpmnxml);
    fs.writeFileSync(
      path.join(__dirname, "samples", "case-received.bpmn"),
      bpmnxml
    );

    expect(bpmnxml).toEqual(expectedBpmnXml);
  });
});
