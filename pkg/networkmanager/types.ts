/*
 * Copyright (C) 2026 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */

import cockpit from "cockpit";

export type CurtainState = "testing" | "restoring" | undefined;

export type NMObjectNewable<T> = new (path: string) => T

/* Low-level IP address and route structures used in parsed settings */

export interface NMIPAddress {
    address: string;
    prefix: string;
}

export interface NMRoute {
    dest: string;
    prefix: string;
    next_hop: string;
    metric: string;
}

/* Per-protocol IP configuration block (ipv4 / ipv6 in NMSettings) */

export interface IPConfig {
    method: string;
    ignore_auto_dns: boolean;
    ignore_auto_routes: boolean;
    address_data: NMIPAddress[];
    gateway: string;
    dns_data: string[];
    dns_search: string[];
    route_data: NMRoute[];
    addr_gen_mode?: number;
}

/* Settings sub-sections returned by settings_from_nm / consumed by settings_to_nm */

export interface ConnectionSettings {
    type: string | undefined;
    uuid: string | undefined;
    interface_name: string | undefined;
    timestamp: number;
    id: string;
    autoconnect: boolean;
    autoconnect_priority: number;
    autoconnect_members: number;
    member_type: string | undefined;
    group: string | undefined;
    multi_connect: number | undefined;
}

export interface EthernetSettings {
    mtu: number | undefined;
    assigned_mac_address: string | undefined;
}

export interface BondSettings {
    options: Record<string, string>;
    interface_name: string | undefined;
}

export interface TeamSettings {
    config: object | null;
    interface_name: string | undefined;
}

export interface TeamPortSettings {
    config: object | null;
}

export interface BridgeSettings {
    interface_name: string | undefined;
    stp: boolean;
    priority: number;
    forward_delay: number;
    hello_time: number;
    max_age: number;
    ageing_time: number;
}

export interface BridgePortSettings {
    priority: number;
    path_cost: number;
    hairpin_mode: boolean;
}

export interface VlanSettings {
    parent: string | undefined;
    id: number | undefined;
    interface_name: string | undefined;
}

export interface WireguardPeer {
    publicKey: string;
    endpoint?: string;
    allowedIps?: string[];
}

export interface WireguardSettings {
    listen_port: number;
    peers: WireguardPeer[];
    private_key?: string;
}

export interface WifiSettings {
    ssid: string | null;
    mode: string | undefined;
}

export interface WifiSecuritySettings {
    "key-mgmt": string | undefined;
    psk: string | undefined;
}

/* Top-level settings object, mirroring the result of settings_from_nm */

export interface NMSettings {
    connection: ConnectionSettings;
    ipv4?: IPConfig;
    ipv6?: IPConfig;
    ethernet?: EthernetSettings;
    bond?: BondSettings;
    team?: TeamSettings;
    team_port?: TeamPortSettings;
    bridge?: BridgeSettings;
    bridge_port?: BridgePortSettings;
    vlan?: VlanSettings;
    wireguard?: WireguardSettings;
    "802-11-wireless"?: WifiSettings;
    "802-11-wireless-security"?: WifiSecuritySettings;
}

/* This is the same interface as NMSettings but keys match what
 * is actually used on dbus. Cockpit makes some changes to it
 * for better compatibility with Javascript
 */

export interface NMSettingsDbus {
    connection: ConnectionSettings;
    ipv4?: IPConfig;
    ipv6?: IPConfig;
    "802-3-ethernet": EthernetSettings; // NMSettings.ethernet
    bond?: BondSettings;
    team?: TeamSettings;
    "team-port"?: TeamPortSettings; // NMSettings.team_port
    bridge?: BridgeSettings;
    "bridge-port"?: BridgePortSettings; // NMSettings.bridge_port
    vlan?: VlanSettings;
    wireguard?: WireguardSettings;
    "802-11-wireless"?: WifiSettings;
    "802-11-wireless-security"?: WifiSecuritySettings;
}

/* NetworkManager D-Bus object shapes (correspond to type_* objects in interfaces.ts) */

export interface Ipv4Config {
    AddressData: NMIPAddress[];
}

export interface Ipv6Config {
    AddressData: NMIPAddress[];
}

export interface AccessPoint {
    Flags: number;
    WpaFlags: number;
    RsnFlags: number;
    Ssid: string;
    Frequency: number;
    HwAddress: string;
    Mode: string;
    MaxBitrate: number;
    Bandwidth: number;
    Strength: number;
    LastSeen: number;
    Connection: Connection | undefined;
}

export interface Connection {
    Unsaved: boolean;
    Settings: NMSettings | null;
    Groups: Connection[];
    Members: Connection[];
    Interfaces: NetworkInterface[];
    copy_settings(): NMSettings;
    apply_settings(settings: NMSettings): Promise<void>;
    activate(dev: Device | null, specific_object: AccessPoint | null): Promise<string>;
    delete_(): Promise<void>;
}

export interface ActiveConnection {
    Connection: Connection | null;
    Ip4Config: Ipv4Config | null;
    Ip6Config: Ipv6Config | null;
    State: number;
    Group: Device | null;
    deactivate(): Promise<void>;
}

export interface Device {
    DeviceType: string; // TODO: NM has specific types, use union
    Interface: string;
    StateText: string;
    State: number;
    StateReason: [number, number];
    HwAddress: string | null;
    AvailableConnections: Connection[];
    ActiveConnection: ActiveConnection | null;
    Ip4Config: Ipv4Config | null;
    Ip6Config: Ipv6Config | null;
    Udi: string;
    IdVendor: string;
    IdModel: string;
    Driver: string;
    Carrier: boolean;
    Speed: number | null;
    Managed: boolean;
    AccessPoints: AccessPoint[];
    ActiveAccessPoint: AccessPoint | null;
    visibleSsids: AccessPoint[];
    hiddenAPCount: number;
    Members: Device[];
    activate(connection: Connection | null, specific_object: AccessPoint | null): Promise<string>;
    activate_with_settings(settings: NMSettings, specific_object?: AccessPoint | null): Promise<{ connection: Connection; active_connection: ActiveConnection }>;
    disconnect(): Promise<void>;
    request_scan(): void;
    consume_failure_reason(): number | undefined;
    cancel_pending_connection(): void;
    wait_connection(expected_ssid: string): Promise<void>;
}

/* Synthetic object representing a network interface (may or may not have a kernel Device) */

export interface NetworkInterface {
    Name: string;
    Device: Device | null;
    _NonDeviceConnections: Connection[];
    Connections: Connection[];
    MainConnection: Connection | null;
}

// TODO: better name
export interface SettingsManager {
    Connections: Connection[];
    add_connection(conf: NMSettings): Promise<Connection>;
}

export interface Manager {
    Capabilities: number[];
    Version: string | undefined;
    Devices: Device[];
    ActiveConnections: ActiveConnection[];
    // TODO: check return types if promise is successful
    checkpoint_create(devices: Device[], timeout: number): Promise<unknown>;
    checkpoint_destroy(checkpoint: string | undefined): Promise<void>;
    checkpoint_rollback(checkpoint: string | undefined): Promise<unknown>;
}

export interface NMModel {
    client: cockpit.DBusClient;
    supports_dns_data: boolean;
    preinit: Promise<void>;
    ready: boolean | undefined;
    operationInProgress: boolean | undefined;
    curtain: CurtainState;

    set_curtain(state: CurtainState): void;
    set_operation_in_progress(value: boolean): void;
    synchronize(): Promise<void>;
    close(): void;
    list_interfaces(): NetworkInterface[];
    find_interface(name: string): NetworkInterface | null;
    get_manager(): Manager | null;
    get_settings(): SettingsManager | null;

    addEventListener(event: string, handler: (...args: any[]) => void): void;
    removeEventListener(event: string, handler: (...args: any[]) => void): void;
    dispatchEvent(event: string): void;
}
