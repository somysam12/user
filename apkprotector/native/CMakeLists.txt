cmake_minimum_required(VERSION 3.18)
project(prtnative C)

add_library(prtnative SHARED anti_tamper.c)

# Hardening for the normal (stock NDK) build.
target_compile_options(prtnative PRIVATE
        -O2 -fvisibility=hidden -fno-stack-protector -ffunction-sections -fdata-sections)
target_link_options(prtnative PRIVATE -Wl,--gc-sections -Wl,-z,noexecstack)

# ============================================================================
# MAX protection: OLLVM passes. Enable with -DOLLVM=ON AND an OLLVM-capable
# clang (NDK_OLLVM). Stock NDK clang does NOT have these passes and will ignore
# or reject the flags, so this block is opt-in.
#
#   Classic Obfuscator-LLVM flags:
#     -mllvm -fla     control-flow flattening
#     -mllvm -bcf     bogus control flow     (-mllvm -bcf_prob=40)
#     -mllvm -sub     instruction substitution
#     -mllvm -split   basic-block splitting
#   Newer forks (Arkari / ollvm-17+) may instead use -mllvm -passes=... ; see native/README.md
# ============================================================================
option(OLLVM "Enable OLLVM obfuscation passes (requires an OLLVM clang)" OFF)
if(OLLVM)
    message(STATUS "OLLVM obfuscation ENABLED")
    target_compile_options(prtnative PRIVATE
            -mllvm -fla
            -mllvm -bcf -mllvm -bcf_prob=40 -mllvm -bcf_loop=3
            -mllvm -sub -mllvm -sub_loop=3
            -mllvm -split -mllvm -split_num=3)
endif()
