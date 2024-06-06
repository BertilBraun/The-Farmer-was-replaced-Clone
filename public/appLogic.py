__user_code = """{USER_CODE}"""
__game_logic = """{GAME_LOGIC}"""

__STD_LIB_FUNCTIONS = ['print']
__LIBRARY_FUNCTIONS = ['{LIBRARY_FUNCTIONS}']
__ALLOWED_FUNCTIONS = ['{ALLOWED_FUNCTIONS}']
__ILLEGAL_PYTHON_STATEMENTS = [
    'import',
    '__',
    'class',
    'raise',
    'try:',
    'except',
    'finally:',
    'with',
    'yield',
    'global',
    'nonlocal',
    'async',
    'await',
]


def __process_code(user_code: str) -> str:
    import re

    def __replace_function_calls(code: str, library: list[str], replacement_regex: str) -> str:
        library_regex = re.compile(f"({'|'.join(library)})\\(")
        processed_code = library_regex.sub(replacement_regex, code)

        return processed_code

    # Replace all library function calls with "await" calls
    # Capture std library functions (print, etc.) and replace them with custom functions (mprint, etc.)
    # Add the browser.aio import at the top of the code
    # pack all the code into an async function called "main"
    # ensure, that all tabs are replaced by 4 spaces
    # ensure, that all the code is properly indented by 4 spaces
    # call the "main" function using browser.aio.run

    library_processed_code = __replace_function_calls(user_code, __LIBRARY_FUNCTIONS, r'await \1(')
    std_lib_processed_code = __replace_function_calls(library_processed_code, __STD_LIB_FUNCTIONS, r'await _m\1(')

    return std_lib_processed_code


def __indent_code(code: str) -> str:
    import re

    tabs_replaced_code = code.replace('\t', '    ')
    indented_code = re.sub(r'(?m)^', '    ', tabs_replaced_code)

    return indented_code


def __exit():
    from browser import window

    window.running = False
    exit()


def __error_exit(error_message: str):
    import traceback

    traceback.print_exc()
    print('Error:', error_message)

    from browser import window

    window.error = error_message
    __exit()


def __format_syntax_error(line: str, lineno: int, offset: int, problem: str) -> str:
    return f"""Syntax Error:
Line {lineno}
{line}
{' ' * offset}^
    -> {problem}"""


def __syntax_error_exit(line: str, lineno: int, offset: int, problem: str):
    __error_exit(__format_syntax_error(line, lineno, offset, problem))


def __verify_code(code: str):
    # This function verifies that the user code is correct (no syntax errors, etc.) and
    # verifies that the code only contains the allowed functions
    # Otherwise, the window.error is set and the program exits

    import re

    # function_call_regex should match all not commented function calls
    function_call_regex = re.compile(r'(?<!#)\b(\w+)\(')
    # dot_regex should match all dots that are not in a string
    dot_regex = re.compile(r'(?<!["\'])\.(?![\'"])')

    for i, line in enumerate(code.split('\n')):
        for illegal_statement in __ILLEGAL_PYTHON_STATEMENTS:
            if illegal_statement in line:
                # If any illegal statement is found in the code, the code is not allowed
                __syntax_error_exit(line, i + 1, line.index(illegal_statement), f'{illegal_statement} is not allowed')

        for function_call in function_call_regex.findall(line):
            if function_call not in __ALLOWED_FUNCTIONS:
                # If any function except the allowed functions is found in the code, the code is not allowed
                __syntax_error_exit(line, i + 1, line.index(function_call), f'Function {function_call} is not allowed')

        for dot_position in [m.start() for m in dot_regex.finditer(line)]:
            # If '.' is used anywhere except for 'Item.' or 'Entity.' or 'Ground.' or in a string, the code is not allowed
            if not any(
                line[dot_position - len(entity) : dot_position] == entity for entity in ['Item', 'Entity', 'Ground']
            ):
                __syntax_error_exit(line, i + 1, dot_position, 'Use of "." is not allowed')

    __syntax_error_check_code = f"""
def main():
{__indent_code(code)}
    """

    try:
        # Try to execute the code to check for syntax errors
        # As the code is wrapped in a function, the code is not executed
        # If the code is incorrect, the SyntaxError is caught and displayed to the user
        exec(__syntax_error_check_code)
    except SyntaxError as e:
        lineno = (e.lineno or 2) - 2  # -2 because the code is wrapped in a function
        text = (e.text or '')[4:]  # [4:] because the code is indented by 4 spaces
        offset = (e.offset or 4) - 4  # -4 because the code is indented by 4 spaces
        __syntax_error_exit(text, lineno, offset, e.msg)


__verify_code(__user_code)

__processed_user_code = __indent_code(__process_code(__user_code))

exec(
    f"""
from math import *
from random import random, choice
from time import time
    
{__game_logic}
      
async def user_code():
{__processed_user_code}

async def main():
    try:
        await user_code()
    except Exception as e:
        __error_exit(repr(e))
    finally:
        __exit()

from browser import aio
aio.run(main())
"""
)
